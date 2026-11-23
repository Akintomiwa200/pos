import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Observable, Subject, type Subscription } from "rxjs";
import { ConsoleService } from "../console/console.service";
import { isSuperAdmin } from "../staff/web-user";
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

type ChatScope = "tenant" | "producer";

type ChatAccount = {
  id: string;
  name: string;
  username: string;
  groupId: string;
  active: boolean;
  avatarUrl?: string | null;
};

type ChatGroup = {
  id: string;
  name: string;
  scope?: ChatScope;
  privileges: string[];
};

type ChatAccess = {
  id: string;
  scope: ChatScope;
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
  accounts: Map<string, ChatAccount>;
  groups: Map<string, ChatGroup>;
};

function groupScope(group?: ChatGroup): ChatScope {
  return group?.scope === "producer" ? "producer" : "tenant";
}

function isAdminGroup(group?: ChatGroup) {
  return (
    group?.id === "g-admin" ||
    (groupScope(group) === "tenant" && Boolean(group?.privileges.includes("*")))
  );
}

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

  /** Resolve the caller from the account directory so visibility is server-enforced. */
  private async access(viewerId: string): Promise<ChatAccess> {
    if (!viewerId) throw new UnauthorizedException("Sign in to use chat");
    const [accounts, groups] = await Promise.all([
      this.console.listAccounts(),
      this.console.listGroups(),
    ]);
    const account = accounts.find((row) => row.id === viewerId);
    if (!account || !account.active) {
      throw new UnauthorizedException("Chat account is unavailable");
    }
    const group = groups.find((row) => row.id === account.groupId);
    const scope = groupScope(group);
    return {
      id: account.id,
      scope,
      isSuperAdmin: isSuperAdmin({
        groupId: account.groupId,
        groupName: group?.name,
        scope,
        privileges: group?.privileges,
      }),
      isTenantAdmin: scope === "tenant" && isAdminGroup(group),
      accounts: new Map(accounts.map((row) => [row.id, row])),
      groups: new Map(groups.map((row) => [row.id, row])),
    };
  }

  private isAccountVisible(access: ChatAccess, accountId: string) {
    const account = access.accounts.get(accountId);
    if (!account || !account.active) return false;
    const group = access.groups.get(account.groupId);
    const scope = groupScope(group);
    const superAdmin = isSuperAdmin({
      groupId: account.groupId,
      groupName: group?.name,
      scope,
      privileges: group?.privileges,
    });

    // Super Admin is reachable only from a tenant admin console (or another
    // producer account); regular tenant staff never see it as a chat target.
    if (superAdmin) return access.isSuperAdmin || access.isTenantAdmin;
    if (scope === "producer") return access.scope === "producer";
    if (access.scope === "producer") {
      return access.isSuperAdmin ? isAdminGroup(group) : false;
    }
    return true;
  }

  private canSeeConversation(access: ChatAccess, conversation: ChatConversation) {
    if (conversation.kind === "customer") return access.scope === "tenant";
    if (!conversation.memberIds.includes(access.id)) return false;
    return conversation.memberIds.every(
      (id) => !access.accounts.has(id) || this.isAccountVisible(access, id),
    );
  }

  private visibleConversations(access: ChatAccess) {
    return this.sortedConversations().filter((row) => this.canSeeConversation(access, row));
  }

  private async visibleConversation(id: string, viewerId: string) {
    const access = await this.access(viewerId);
    const conversation = this.conversations.find((row) => row.id === id);
    if (!conversation || !this.canSeeConversation(access, conversation)) {
      throw new NotFoundException("Conversation not found");
    }
    return { access, conversation };
  }

  private visiblePresence(access: ChatAccess, presence: ChatPresence[]) {
    return presence.filter((row) => this.isAccountVisible(access, row.accountId));
  }

  private filterEvent(access: ChatAccess, event: ChatEvent): ChatEvent | null {
    if (event.type === "message" || event.type === "conversation") {
      return this.canSeeConversation(access, event.conversation) ? event : null;
    }
    if (event.type === "typing" || event.type === "call") {
      const conversation = this.conversations.find((row) => row.id === event.conversationId);
      return conversation && this.canSeeConversation(access, conversation) ? event : null;
    }
    if (event.type === "presence") {
      return { ...event, presence: this.visiblePresence(access, event.presence) };
    }
    return event;
  }

  stream(viewerId: string): Observable<ChatEvent> {
    return new Observable((subscriber) => {
      let cancelled = false;
      let sub: Subscription | undefined;
      void this.access(viewerId)
        .then((access) => {
          if (cancelled) return;
          subscriber.next({
            type: "snapshot",
            conversations: this.visibleConversations(access),
            presence: this.visiblePresence(access, this.presenceSnapshot()),
          });
          sub = this.events.subscribe((event) => {
            const forwarded = this.filterEvent(access, event);
            if (forwarded) subscriber.next(forwarded);
          });
        })
        .catch((error) => subscriber.error(error));
      return () => {
        cancelled = true;
        sub?.unsubscribe();
      };
    });
  }

  private sortedConversations() {
    return [...this.conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async listConversations(viewerId: string) {
    const access = await this.access(viewerId);
    return this.visibleConversations(access);
  }

  async getThread(id: string, viewerId: string): Promise<ChatThread> {
    const access = await this.access(viewerId);
    const conversation = this.conversations.find((row) => row.id === id);
    if (!conversation || !this.canSeeConversation(access, conversation)) {
      throw new NotFoundException("Conversation not found");
    }
    const messages = this.messages
      .filter((row) => row.conversationId === id)
      .sort((a, b) => a.at.localeCompare(b.at));
    return { conversation, messages };
  }

  /** People the caller may start a chat with, scoped by role and tenant. */
  async listChatTargets(viewerId: string): Promise<ChatTarget[]> {
    const access = await this.access(viewerId);
    return [...access.accounts.values()]
      .filter((account) => account.id !== access.id && this.isAccountVisible(access, account.id))
      .map((account) => ({
        id: account.id,
        name: account.name,
        username: account.username,
        avatar: account.avatarUrl ?? undefined,
        groupName: access.groups.get(account.groupId)?.name ?? account.groupId,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async createConversation(input: {
    kind?: ConversationKind;
    memberIds?: string[];
    name?: string;
    createdBy?: { id?: string; name?: string };
    viewerId: string;
  }) {
    const kind = input.kind === "group" ? "group" : input.kind === "customer" ? "customer" : "direct";
    const memberIds = Array.from(new Set((input.memberIds ?? []).filter(Boolean)));
    const access = await this.access(input.viewerId);
    const from = input.createdBy?.id || access.id;
    if (from !== access.id) throw new ForbiddenException("You cannot start a chat as another account");
    if (kind === "customer" && access.scope !== "tenant") {
      throw new ForbiddenException("Customer chats are tenant-only");
    }
    const participants = new Set([from, ...memberIds]);
    if (![...participants].every((id) => this.isAccountVisible(access, id))) {
      throw new ForbiddenException("You cannot chat with one of these accounts");
    }
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
          row.memberIds.includes(from) &&
          row.memberIds.includes(other),
      );
      if (existing) return existing;
    }

    const otherName = memberIds[0] ?? "";
    const avatar =
      kind === "direct" ? (access.accounts.get(memberIds[0])?.avatarUrl ?? undefined) : undefined;
    const conversation: ChatConversation = {
      id: `chat-${kind}-${Date.now()}`,
      kind,
      avatar,
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
    const creatorName = access.accounts.get(access.id)?.name ?? input.createdBy?.name ?? "System";
    this.messages.push({
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      conversationId: conversation.id,
      sender: "system",
      senderName: creatorName,
      body: kind === "group" ? `${creatorName} created the group.` : "Chat started.",
      at: conversation.updatedAt,
      kind: "system",
    });
    await this.persist();
    this.events.next({ type: "conversation", conversation, action: "created" });
    return conversation;
  }

  async sendMessage(
    conversationId: string,
    body: { text?: string; senderName?: string; senderId?: string; kind?: "text" | "system" },
    viewerId: string,
  ) {
    const text = body.text?.trim();
    if (!text) throw new BadRequestException("Message text is required");
    const { access, conversation } = await this.visibleConversation(conversationId, viewerId);

    const isSystem = body.kind === "system";
    const self = access.accounts.get(access.id);
    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      conversationId,
      sender: isSystem ? "system" : "staff",
      senderId: isSystem ? undefined : access.id,
      senderName: isSystem
        ? body.senderName?.trim() || "System"
        : self?.name ?? body.senderName?.trim() ?? "You",
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
    viewerId: string,
  ) {
    const { conversation } = await this.visibleConversation(id, viewerId);
    if (typeof body.locationEnabled === "boolean") {
      conversation.locationEnabled = body.locationEnabled;
    }
    if (typeof body.active === "boolean") conversation.active = body.active;
    if (typeof body.location === "string") conversation.location = body.location.trim();
    await this.persist();
    this.events.next({ type: "conversation", conversation, action: "updated" });
    return conversation;
  }

  async sendTyping(
    conversationId: string,
    body: { name?: string; state?: "on" | "off" },
    viewerId: string,
  ) {
    await this.visibleConversation(conversationId, viewerId);
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
    viewerId: string,
  ) {
    const { access } = await this.visibleConversation(conversationId, viewerId);
    if (!body.signal?.type) throw new BadRequestException("Call signal is required");
    const { from: _from, ...baseSignal } = body.signal;
    const self = access.accounts.get(access.id);
    const from = {
      id: access.id,
      name: self?.name ?? body.from?.name?.trim() ?? "Someone",
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