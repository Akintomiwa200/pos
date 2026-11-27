import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Observable, Subject, type Subscription } from "rxjs";
import { ConsoleService } from "../console/console.service";
import { isSuperAdmin, isTenantAdmin, rankFor, type Rank } from "../staff/web-user";
import {
  CHAT_UPLOAD_DIR,
  MAX_CHAT_ATTACHMENTS_PER_MESSAGE,
  type ChatAttachmentRecord,
  publicChatAttachment,
  readChatAttachmentFile,
  readChatAttachmentRecords,
  removeChatAttachmentFile,
  storeChatAttachmentFile,
  validateChatAttachment,
  writeChatAttachmentRecords,
} from "../uploads/chat-attachments";
import {
  type CallSignal,
  type ChatAttachment,
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
  companyId?: string | null;
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
  companyId: string | null;
  rank: Rank;
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
  accounts: Map<string, ChatAccount>;
  groups: Map<string, ChatGroup>;
};

function groupScope(group?: ChatGroup): ChatScope {
  return group?.scope === "producer" ? "producer" : "tenant";
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
  /** Serialises read/modify/write cycles on chat-uploads.json. */
  private attachmentWrite: Promise<void> = Promise.resolve();

  constructor(private readonly console: ConsoleService) {}

  async onModuleInit() {
    await mkdir(this.dir, { recursive: true });
    await mkdir(CHAT_UPLOAD_DIR, { recursive: true });
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

  private async withAttachmentLock<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.attachmentWrite.then(operation, operation);
    this.attachmentWrite = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private presenceSnapshot(): ChatPresence[] {
    return [...this.presences.values()].sort((a, b) => b.at.localeCompare(a.at));
  }

  /** A client-supplied account id is never accepted without a matching session token. */
  private async assertCaller(viewerId: string, token?: string) {
    if (!viewerId || !token) throw new UnauthorizedException("Sign in to use chat");
    const session = await this.console.me(token).catch(() => null);
    if (!session || session.user.id !== viewerId) {
      throw new UnauthorizedException("Sign in to use chat");
    }
    return session;
  }

  /** Resolve the caller from the account directory so visibility is server-enforced. */
  private async access(viewerId: string, token?: string): Promise<ChatAccess> {
    const session = await this.assertCaller(viewerId, token);
    const viewer = session.user;
    const [accounts, groups] = await Promise.all([
      // Tenants never receive platform accounts in their directory.
      this.console.listAccounts(
        viewer.isSuperAdmin ? undefined : { companyId: viewer.companyId ?? "__none__" },
      ),
      this.console.listGroups(),
    ]);
    const account = accounts.find((row) => row.id === viewerId);
    if (!account || !account.active) {
      throw new UnauthorizedException("Chat account is unavailable");
    }
    const group = groups.find((row) => row.id === account.groupId);
    const scope = groupScope(group);
    const identity = {
      groupId: account.groupId,
      groupName: group?.name,
      scope,
      privileges: group?.privileges,
      companyId: account.companyId,
    };
    return {
      id: account.id,
      scope,
      companyId: viewer.companyId ?? null,
      rank: rankFor(identity),
      isSuperAdmin: isSuperAdmin(identity),
      isTenantAdmin: isTenantAdmin(identity),
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

    // Company consoles only ever see people inside their own company.
    // Platform accounts (Super Admin / producer roles) are never chat targets
    // for tenant Admin or staff.
    if (!access.isSuperAdmin) {
      if (superAdmin || scope === "producer") return false;
      return Boolean(access.companyId && account.companyId === access.companyId);
    }
    return true;
  }

  private canSeeConversation(access: ChatAccess, conversation: ChatConversation) {
    if (conversation.kind === "customer") return access.scope === "tenant";
    if (!conversation.memberIds.includes(access.id)) return false;
    return conversation.memberIds.every((id) => this.isAccountVisible(access, id));
  }

  private visibleConversations(access: ChatAccess) {
    return this.sortedConversations().filter((row) => this.canSeeConversation(access, row));
  }

  private async visibleConversation(id: string, viewerId: string, token?: string) {
    const access = await this.access(viewerId, token);
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
    if (event.type === "typing") {
      // A sender never needs to see their own typing indicator.
      if (event.senderId && event.senderId === access.id) return null;
      const conversation = this.conversations.find((row) => row.id === event.conversationId);
      return conversation && this.canSeeConversation(access, conversation) ? event : null;
    }
    if (event.type === "call") {
      const conversation = this.conversations.find((row) => row.id === event.conversationId);
      return conversation && this.canSeeConversation(access, conversation) ? event : null;
    }
    if (event.type === "presence") {
      return { ...event, presence: this.visiblePresence(access, event.presence) };
    }
    return event;
  }

  stream(viewerId: string, token?: string): Observable<ChatEvent> {
    return new Observable((subscriber) => {
      let cancelled = false;
      let sub: Subscription | undefined;
      void this.access(viewerId, token)
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

  async listConversations(viewerId: string, token?: string) {
    const access = await this.access(viewerId, token);
    return this.visibleConversations(access);
  }

  async getThread(id: string, viewerId: string, token?: string): Promise<ChatThread> {
    const access = await this.access(viewerId, token);
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
  async listChatTargets(viewerId: string, token?: string): Promise<ChatTarget[]> {
    const access = await this.access(viewerId, token);
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
    token?: string;
  }) {
    const kind = input.kind === "group" ? "group" : input.kind === "customer" ? "customer" : "direct";
    const memberIds = Array.from(new Set((input.memberIds ?? []).filter(Boolean)));
    const access = await this.access(input.viewerId, input.token);
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

    const other = memberIds[0] ?? "";
    const otherAccount = access.accounts.get(other);
    const avatar = kind === "direct" ? (otherAccount?.avatarUrl ?? undefined) : undefined;
    const conversation: ChatConversation = {
      id: `chat-${kind}-${Date.now()}`,
      kind,
      avatar,
      name:
        kind === "group"
          ? (input.name?.trim() || "Group chat")
          : input.name?.trim() || otherAccount?.name || "New chat",
      preview:
        kind === "group" ? `${participants.size} members` : `Say hello to ${otherAccount?.name ?? "your teammate"} 👋`,
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
    body: {
      text?: string;
      senderName?: string;
      senderId?: string;
      kind?: "text" | "system";
      attachmentIds?: string[];
    },
    viewerId: string,
    token?: string,
  ) {
    const text = body.text?.trim() || "";
    const attachmentIds = Array.isArray(body.attachmentIds)
      ? [
          ...new Set(
            body.attachmentIds.filter(
              (id): id is string => typeof id === "string" && Boolean(id.trim()),
            ),
          ),
        ]
      : [];
    const { access, conversation } = await this.visibleConversation(conversationId, viewerId, token);
    if (!text && !attachmentIds.length) {
      throw new BadRequestException("Message text is required or attach a file");
    }
    if (attachmentIds.length > MAX_CHAT_ATTACHMENTS_PER_MESSAGE) {
      throw new BadRequestException(
        `You can attach up to ${MAX_CHAT_ATTACHMENTS_PER_MESSAGE} files per message.`,
      );
    }

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const attachments = attachmentIds.length
      ? await this.withAttachmentLock(async () => {
          const records = await readChatAttachmentRecords();
          const selected: ChatAttachmentRecord[] = [];
          for (const id of attachmentIds) {
            const record = records.find((row) => row.id === id);
            if (!record) throw new NotFoundException("Attachment not found");
            // IDs are only usable by the account that uploaded them, once.
            if (record.uploaderId !== access.id) {
              throw new ForbiddenException("You cannot attach a file uploaded by another user");
            }
            if (record.status !== "pending") {
              throw new BadRequestException("That file has already been attached to a chat");
            }
            selected.push(record);
          }
          for (const record of selected) {
            record.status = "attached";
            record.conversationId = conversationId;
            record.messageId = messageId;
          }
          await writeChatAttachmentRecords(records);
          return selected.map(publicChatAttachment);
        })
      : [];

    const isSystem = body.kind === "system";
    const self = access.accounts.get(access.id);
    const message: ChatMessage = {
      id: messageId,
      conversationId,
      sender: isSystem ? "system" : "staff",
      senderId: isSystem ? undefined : access.id,
      senderName: isSystem
        ? body.senderName?.trim() || "System"
        : self?.name ?? body.senderName?.trim() ?? "You",
      body: text,
      at: new Date().toISOString(),
      kind: isSystem ? "system" : "text",
      attachments: attachments.length ? attachments : undefined,
    };
    this.messages.push(message);
    conversation.preview = text
      ? text.slice(0, 80)
      : `📎 ${attachments[0]?.name ?? "Attachment"}${
          attachments.length > 1 ? ` +${attachments.length - 1}` : ""
        }`;
    conversation.updatedAt = message.at;
    conversation.active = true;
    await this.persist();
    this.events.next({ type: "message", message, conversation });
    return message;
  }

  /** Uploads are unattached until a message claims them, so they cannot be borrowed. */
  async uploadAttachment(
    file: Express.Multer.File,
    viewerId: string,
    token?: string,
  ): Promise<ChatAttachment> {
    const access = await this.access(viewerId, token);
    const validated = validateChatAttachment(file);
    const storedName = await storeChatAttachmentFile(file, validated.extension);
    const id = `att-${randomUUID()}`;
    const record: ChatAttachmentRecord = {
      id,
      name: validated.name,
      mimeType: validated.mimeType,
      size: validated.size,
      url: `/api/chat/files/${encodeURIComponent(id)}`,
      storedName,
      uploaderId: access.id,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    try {
      await this.withAttachmentLock(async () => {
        const records = await readChatAttachmentRecords();
        records.push(record);
        await writeChatAttachmentRecords(records);
      });
    } catch (error) {
      await removeChatAttachmentFile(storedName).catch(() => undefined);
      throw error;
    }
    return publicChatAttachment(record);
  }

  /** Authorised download: pending files belong to the uploader, attached files to members. */
  async getAttachmentFile(id: string, viewerId: string, token?: string) {
    const access = await this.access(viewerId, token);
    const record = (await readChatAttachmentRecords()).find((row) => row.id === id);
    if (!record || record.status === "orphan") throw new NotFoundException("File not found");
    if (record.conversationId) {
      const conversation = this.conversations.find((row) => row.id === record.conversationId);
      if (!conversation || !this.canSeeConversation(access, conversation)) {
        throw new NotFoundException("File not found");
      }
    } else if (record.uploaderId !== access.id) {
      throw new NotFoundException("File not found");
    }
    const buffer = await readChatAttachmentFile(record.storedName);
    if (!buffer) throw new NotFoundException("File not found");
    return { record, buffer };
  }

  /** Discard an upload the caller selected but never sent. */
  async removeAttachment(id: string, viewerId: string, token?: string) {
    const access = await this.access(viewerId, token);
    await this.withAttachmentLock(async () => {
      const records = await readChatAttachmentRecords();
      const record = records.find((row) => row.id === id);
      if (!record || record.uploaderId !== access.id || record.status !== "pending") {
        throw new NotFoundException("File not found");
      }
      await removeChatAttachmentFile(record.storedName);
      await writeChatAttachmentRecords(records.filter((row) => row.id !== id));
    });
    return { ok: true as const, id };
  }

  /** Removing a chat keeps uploaded bytes but detaches the metadata from the chat. */
  async deleteConversation(id: string, viewerId: string, token?: string) {
    const { conversation } = await this.visibleConversation(id, viewerId, token);
    const orphanedAt = new Date().toISOString();
    this.conversations = this.conversations.filter((row) => row.id !== id);
    this.messages = this.messages.filter((row) => row.conversationId !== id);
    await this.withAttachmentLock(async () => {
      const records = await readChatAttachmentRecords();
      let changed = false;
      for (const record of records) {
        if (record.conversationId === id && record.status !== "orphan") {
          record.status = "orphan";
          record.conversationId = undefined;
          record.orphanedAt = orphanedAt;
          changed = true;
        }
      }
      if (changed) await writeChatAttachmentRecords(records);
    });
    await this.persist();
    this.events.next({ type: "conversation", conversation, action: "deleted" });
    return { ok: true as const, id };
  }

  async patchConversation(
    id: string,
    body: Partial<Pick<ChatConversation, "locationEnabled" | "active" | "location">>,
    viewerId: string,
    token?: string,
  ) {
    const { conversation } = await this.visibleConversation(id, viewerId, token);
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
    token?: string,
  ) {
    const { access } = await this.visibleConversation(conversationId, viewerId, token);
    const event = {
      type: "typing" as const,
      conversationId,
      name: body.name?.trim() || "Someone",
      senderId: access.id,
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
    token?: string,
  ) {
    const { access } = await this.visibleConversation(conversationId, viewerId, token);
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
  async touchPresence(accountId: string, name?: string, token?: string) {
    if (!accountId) throw new BadRequestException("accountId is required");
    await this.assertCaller(accountId, token);
    const at = new Date().toISOString();
    const heading = name?.trim() || this.presences.get(accountId)?.name || "Someone";
    this.presences.set(accountId, { accountId, name: heading, at });
    this.events.next({ type: "presence", presence: this.presenceSnapshot() });
    return { ok: true };
  }
}