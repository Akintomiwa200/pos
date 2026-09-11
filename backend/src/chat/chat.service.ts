import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Observable, Subject } from "rxjs";
import { ConsoleService } from "../console/console.service";
import {
  type CallSignal,
  type ChatConversation,
  type ChatEvent,
  type ChatMessage,
  type ChatPresence,
  type ChatTarget,
  type ChatThread,
  type ConversationKind,
} from "./chat.types";

@Injectable()
export class ChatService implements OnModuleInit {
  private conversations: ChatConversation[] = [];
  private messages: ChatMessage[] = [];
  private readonly events = new Subject<ChatEvent>();
  private readonly dir = join(process.cwd(), "data");
  private readonly conversationsFile = join(this.dir, "hq-chat-conversations.json");
  private readonly messagesFile = join(this.dir, "hq-chat-messages.json");
  private readonly presences = new Map<string, ChatPresence>();

  constructor(private readonly console: ConsoleService) {}

  async onModuleInit() {
    await mkdir(this.dir, { recursive: true });
    this.conversations = await this.readJson<ChatConversation[]>(
      this.conversationsFile,
      [],
    );
    this.messages = await this.readJson<ChatMessage[]>(this.messagesFile, []);
  }

  private async readJson<T>(file: string, fallback: T): Promise<T> {
    try {
      const raw = await readFile(file, "utf8");
      return JSON.parse(raw) as T;
    } catch {
      return structuredClone(fallback);
    }
  }

  private async persist() {
    await Promise.all([
      writeFile(this.conversationsFile, JSON.stringify(this.conversations, null, 2), "utf8"),
      writeFile(this.messagesFile, JSON.stringify(this.messages, null, 2), "utf8"),
    ]);
  }

  private presenceSnapshot(): ChatPresence[] {
    return [...this.presences.values()].sort((a, b) => b.at.localeCompare(a.at));
  }

  stream(): Observable<ChatEvent> {
    return new Observable((subscriber) => {
      subscriber.next({
        type: "snapshot",
        conversations: this.listConversations(),
        presence: this.presenceSnapshot(),
      });
      const sub = this.events.subscribe((event) => subscriber.next(event));
      return () => sub.unsubscribe();
    });
  }

  listConversations() {
    return [...this.conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getThread(id: string): ChatThread {
    const conversation = this.conversations.find((row) => row.id === id);
    if (!conversation) throw new NotFoundException("Conversation not found");
    const messages = this.messages
      .filter((row) => row.conversationId === id)
      .sort((a, b) => a.at.localeCompare(b.at));
    return { conversation, messages };
  }

  /** Everyone who can be added to a new chat (active console accounts). */
  async listChatTargets(): Promise<ChatTarget[]> {
    const accounts = await this.console.listAccounts();
    return accounts
      .filter((account) => account.active)
      .map((account) => ({
        id: account.id,
        name: account.name,
        username: account.username,
        groupName: account.groupId,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async createConversation(input: {
    kind?: ConversationKind;
    memberIds?: string[];
    name?: string;
    createdBy?: { id?: string; name?: string };
  }) {
    const kind = input.kind === "group" ? "group" : input.kind === "customer" ? "customer" : "direct";
    const memberIds = Array.from(new Set((input.memberIds ?? []).filter(Boolean)));
    const from = input.createdBy?.id;
    if (kind === "direct" && memberIds.length !== 1) {
      throw new BadRequestException("Direct chats need exactly one other member");
    }

    // Reuse an existing direct chat between the same two people.
    if (kind === "direct") {
      const other = memberIds[0];
      const existing = this.conversations.find(
        (row) =>
          row.kind === "direct" &&
          row.memberIds.length === 2 &&
          ((!from || row.memberIds.includes(from)) && row.memberIds.includes(other)),
      );
      if (existing) return existing;
    }

    const otherName = memberIds[0] ?? "";
    const conversation: ChatConversation = {
      id: `chat-${kind}-${Date.now()}`,
      kind,
      name:
        kind === "group"
          ? (input.name?.trim() || "Group chat")
          : input.name?.trim() || otherName,
      preview: kind === "group" ? `${memberIds.length + (input.createdBy ? 1 : 0)} members` : "Say hello 👋",
      updatedAt: new Date().toISOString(),
      memberIds: from && !memberIds.includes(from) ? [from, ...memberIds] : memberIds,
      createdBy: from,
      active: true,
      locationEnabled: false,
      totalOrders: 0,
      totalBuyMinor: 0,
      purchased: [],
    };

    this.conversations.unshift(conversation);
    const createdBy = input.createdBy?.id;
    if (createdBy) {
      this.messages.push({
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        conversationId: conversation.id,
        sender: "system",
        senderName: input.createdBy?.name ?? "System",
        body: kind === "group" ? `${input.createdBy?.name ?? "Someone"} created the group.` : "Chat started.",
        at: conversation.updatedAt,
        kind: "system",
      });
    }
    await this.persist();
    this.events.next({ type: "conversation", conversation, action: "created" });
    return conversation;
  }

  async sendMessage(
    conversationId: string,
    body: { text?: string; senderName?: string; senderId?: string; kind?: "text" | "system" },
  ) {
    const text = body.text?.trim();
    if (!text) throw new BadRequestException("Message text is required");
    const conversation = this.conversations.find((row) => row.id === conversationId);
    if (!conversation) throw new NotFoundException("Conversation not found");

    const isSystem = body.kind === "system";
    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      conversationId,
      sender: isSystem ? "system" : "staff",
      senderId: body.senderId?.trim() || undefined,
      senderName: body.senderName?.trim() || "You",
      body: text,
      at: new Date().toISOString(),
      kind: isSystem ? "system" : "text",
    };
    this.messages.push(message);
    conversation.preview = text.slice(0, 80);
    conversation.updatedAt = message.at;
    conversation.active = true;
    await this.persist();
    this.events.next({ type: "message", message, conversation });
    return message;
  }

  async patchConversation(
    id: string,
    body: Partial<Pick<ChatConversation, "locationEnabled" | "active" | "location">>,
  ) {
    const conversation = this.conversations.find((row) => row.id === id);
    if (!conversation) throw new NotFoundException("Conversation not found");
    if (typeof body.locationEnabled === "boolean") {
      conversation.locationEnabled = body.locationEnabled;
    }
    if (typeof body.active === "boolean") conversation.active = body.active;
    if (typeof body.location === "string") conversation.location = body.location.trim();
    await this.persist();
    this.events.next({ type: "conversation", conversation, action: "updated" });
    return conversation;
  }

  async sendTyping(conversationId: string, body: { name?: string; state?: "on" | "off" }) {
    const conversation = this.conversations.find((row) => row.id === conversationId);
    if (!conversation) throw new NotFoundException("Conversation not found");
    const event = {
      type: "typing" as const,
      conversationId,
      name: body.name?.trim() || "Someone",
      state: body.state === "off" ? ("off" as const) : ("on" as const),
      at: new Date().toISOString(),
    };
    this.events.next(event);
    return { ok: true };
  }

  async relayCall(
    conversationId: string,
    body: { signal?: CallSignal; from?: { id?: string; name?: string } },
  ) {
    const conversation = this.conversations.find((row) => row.id === conversationId);
    if (!conversation) throw new NotFoundException("Conversation not found");
    if (!body.signal?.type) throw new BadRequestException("Call signal is required");
    const { from: _from, ...baseSignal } = body.signal;
    const from = {
      id: body.from?.id?.trim() || "unknown",
      name: body.from?.name?.trim() || "Someone",
    };
    const signal: CallSignal = { ...baseSignal, from } as CallSignal;
    this.events.next({ type: "call", conversationId, signal, at: new Date().toISOString() });
    return { ok: true };
  }

  /** Mark an account as online. Callers should ping every ~15s while on the chat page. */
  touchPresence(accountId: string, name?: string) {
    if (!accountId) throw new BadRequestException("accountId is required");
    const at = new Date().toISOString();
    const heading = name?.trim() || this.presences.get(accountId)?.name || "Someone";
    this.presences.set(accountId, { accountId, name: heading, at });
    this.events.next({ type: "presence", presence: this.presenceSnapshot() });
    return { ok: true };
  }
}