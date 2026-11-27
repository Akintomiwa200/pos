import { api, NetworkError, readSession } from "./hq-api";

export type ConversationKind = "customer" | "direct" | "group";

/** Public attachment metadata returned by the chat upload endpoint. */
export type ChatAttachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  sender: "customer" | "staff" | "system";
  senderId?: string;
  senderName: string;
  body: string;
  at: string;
  kind?: "text" | "system";
  attachments?: ChatAttachment[];
};

export type ChatConversation = {
  id: string;
  kind: ConversationKind;
  name: string;
  avatar?: string;
  preview: string;
  updatedAt: string;
  memberIds: string[];
  createdBy?: string;
  customerId?: string;
  active: boolean;
  locationEnabled: boolean;
  location?: string;
  totalOrders: number;
  totalBuyMinor: number;
  purchased: Array<{ id: string; name: string; image: string }>;
};

export type ChatThread = {
  conversation: ChatConversation;
  messages: ChatMessage[];
};

export type ChatTarget = {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  groupName?: string;
};

export type ChatPresence = {
  accountId: string;
  name: string;
  at: string;
};

export type CallMode = "audio" | "video";

type CallPeer = { id: string; name: string };

export type CallSignal =
  | { type: "ring" | "cancel" | "end" | "accept" | "decline"; from: CallPeer; mode: CallMode }
  | { type: "offer" | "answer"; from: CallPeer; mode: CallMode; sdp: RTCSessionDescriptionInit }
  | { type: "candidate"; from: CallPeer; candidate: RTCIceCandidateInit }
  | { type: "switch"; from: CallPeer; mode: CallMode };

export type ChatEvent =
  | { type: "snapshot"; conversations: ChatConversation[]; presence: ChatPresence[] }
  | { type: "message"; message: ChatMessage; conversation: ChatConversation }
  | {
      type: "conversation";
      conversation: ChatConversation;
      action: "updated" | "created" | "deleted";
    }
  | {
      type: "typing";
      conversationId: string;
      name: string;
      senderId?: string;
      state: "on" | "off";
      at: string;
    }
  | { type: "call"; conversationId: string; signal: CallSignal; at: string }
  | { type: "presence"; presence: ChatPresence[] };

type CreateChatInput = {
  kind: "direct" | "group" | "customer";
  memberIds?: string[];
  name?: string;
  createdBy?: { id?: string; name?: string };
  viewerId: string;
};

function viewerQuery(viewerId: string) {
  return `viewerId=${encodeURIComponent(viewerId)}`;
}

export const MAX_CHAT_ATTACHMENT_BYTES = 20 * 1024 * 1024;
export const CHAT_ATTACHMENT_ACCEPT =
  ".png,.jpg,.jpeg,.gif,.webp,.pdf,.csv,.tsv,.json,.txt,.doc,.docx,.xls,.xlsx,.zip";
export const CHAT_ATTACHMENT_TYPES_LABEL =
  "PNG, JPEG, GIF, WebP, PDF, CSV, TSV, JSON, TXT, DOC, DOCX, XLS, XLSX and ZIP files only (max 20 MB).";

const CHAT_ATTACHMENT_EXTENSIONS = new Set(
  CHAT_ATTACHMENT_ACCEPT.split(",").map((item) => item.slice(1)),
);

/** Same rules as the server; fail fast in the browser with a readable message. */
export function chatAttachmentError(file: File): string | null {
  if (!file.size) return "That file is empty.";
  if (file.size > MAX_CHAT_ATTACHMENT_BYTES) {
    return `Files must be 20 MB or smaller. ${CHAT_ATTACHMENT_TYPES_LABEL}`;
  }
  const extension = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  if (!CHAT_ATTACHMENT_EXTENSIONS.has(extension)) {
    return `Unsupported file type "${extension || "unknown"}". ${CHAT_ATTACHMENT_TYPES_LABEL}`;
  }
  return null;
}

export function formatChatAttachmentSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Downloads need viewerId + token in the query because <img>/new-tab navigation
 * cannot send an Authorization header. The token is never persisted with messages.
 */
export function chatAttachmentUrl(id: string) {
  const session = readSession();
  const params = new URLSearchParams();
  if (session?.id) params.set("viewerId", session.id);
  if (session?.token) params.set("token", session.token);
  return `/api/chat/files/${encodeURIComponent(id)}?${params.toString()}`;
}

/** Multipart is not supported by the shared api() helper, so use fetch like the avatar uploader. */
export async function uploadChatAttachment(file: File, viewerId?: string): Promise<ChatAttachment> {
  const problem = chatAttachmentError(file);
  if (problem) throw new Error(problem);
  const session = readSession();
  const token = session?.token ?? "";
  const form = new FormData();
  form.append("file", file);
  form.append("viewerId", viewerId ?? session?.id ?? "");
  let response: Response;
  try {
    response = await fetch("/api/chat/files", {
      method: "POST",
      body: form,
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new NetworkError("POST /api/chat/files");
  }
  const data = (await response.json().catch(() => ({}))) as ChatAttachment & {
    message?: string | string[];
  };
  if (!response.ok) {
    if (response.status >= 500) {
      throw new NetworkError(`POST /api/chat/files (${response.status})`);
    }
    const message = Array.isArray(data.message) ? data.message[0] : data.message;
    throw new Error(message || "Upload failed");
  }
  return {
    id: data.id,
    name: data.name,
    mimeType: data.mimeType,
    size: data.size,
    url: data.url,
  };
}

export async function listChatConversations(viewerId: string) {
  return api<ChatConversation[]>(`/api/chat/conversations?${viewerQuery(viewerId)}`);
}

export async function getChatThread(id: string, viewerId: string) {
  return api<ChatThread>(`/api/chat/conversations/${id}?${viewerQuery(viewerId)}`);
}

export async function listChatTargets(viewerId: string) {
  return api<ChatTarget[]>(`/api/chat/targets?${viewerQuery(viewerId)}`);
}

export async function createChatConversation(input: CreateChatInput) {
  return api<ChatConversation>("/api/chat/conversations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function sendChatMessage(
  id: string,
  text: string,
  extra:
    | {
        senderName?: string;
        senderId?: string;
        kind?: "text" | "system";
        attachmentIds?: string[];
      }
    | undefined,
  viewerId: string,
) {
  return api<ChatMessage>(`/api/chat/conversations/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ text, ...extra, viewerId }),
  });
}

/** Clean up a selected file the user removed before sending. */
export async function deleteChatAttachment(id: string, viewerId: string) {
  return api<{ ok: true; id: string }>(`/api/chat/files/${encodeURIComponent(id)}`, {
    method: "DELETE",
    body: JSON.stringify({ viewerId }),
  });
}

export async function sendChatTyping(
  id: string,
  state: "on" | "off",
  name: string | undefined,
  viewerId: string,
) {
  return api<{ ok: true }>(`/api/chat/conversations/${id}/typing`, {
    method: "POST",
    body: JSON.stringify({ name, state, viewerId }),
  });
}

export async function sendCallSignal(
  id: string,
  signal: CallSignal,
  from: { id?: string; name?: string } | undefined,
  viewerId: string,
) {
  return api<{ ok: true }>(`/api/chat/conversations/${id}/calls`, {
    method: "POST",
    body: JSON.stringify({ signal, from, viewerId }),
  });
}

export async function sendChatPresence(accountId?: string, name?: string) {
  return api<{ ok: true }>("/api/chat/presence", {
    method: "POST",
    body: JSON.stringify({ accountId, name }),
  });
}

export async function patchChatConversation(
  id: string,
  body: Partial<Pick<ChatConversation, "locationEnabled" | "active" | "location">>,
  viewerId: string,
) {
  return api<ChatConversation>(`/api/chat/conversations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...body, viewerId }),
  });
}