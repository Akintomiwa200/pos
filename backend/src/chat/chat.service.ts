import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Observable, Subject } from "rxjs";
import {
  SEED_CONVERSATIONS,
  SEED_MESSAGES,
  type ChatConversation,
  type ChatEvent,
  type ChatMessage,
  type ChatThread,
} from "./chat.types";

@Injectable()
export class ChatService implements OnModuleInit {
  private conversations: ChatConversation[] = [];
  private messages: ChatMessage[] = [];
  private readonly events = new Subject<ChatEvent>();
  private readonly dir = join(process.cwd(), "data");
  private readonly conversationsFile = join(this.dir, "hq-chat-conversations.json");
  private readonly messagesFile = join(this.dir, "hq-chat-messages.json");

  async onModuleInit() {
    await mkdir(this.dir, { recursive: true });
    this.conversations = await this.readJson(this.conversationsFile, SEED_CONVERSATIONS);
    this.messages = await this.readJson(this.messagesFile, SEED_MESSAGES);
    if (!this.conversations.length) {
      this.conversations = structuredClone(SEED_CONVERSATIONS);
      this.messages = structuredClone(SEED_MESSAGES);
      await this.persist();
    }
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

  stream(): Observable<ChatEvent> {
    return new Observable((subscriber) => {
      subscriber.next({
        type: "snapshot",
        conversations: this.listConversations(),
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

  async sendMessage(conversationId: string, body: { text?: string; senderName?: string }) {
    const text = body.text?.trim();
    if (!text) throw new BadRequestException("Message text is required");
    const conversation = this.conversations.find((row) => row.id === conversationId);
    if (!conversation) throw new NotFoundException("Conversation not found");

    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      conversationId,
      sender: "staff",
      senderName: body.senderName?.trim() || "You",
      body: text,
      at: new Date().toISOString(),
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
}
