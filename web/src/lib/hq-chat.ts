import { api } from "./hq-api";

export type ConversationKind = "customer" | "direct" | "group";

export type ChatMessage = {
  id: string;
  conversationId: string;
  sender: "customer" | "staff" | "system";
  senderId?: string;
  senderName: string;
  body: string;
  at: string;
  kind?: "text" | "system";
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
  | { type: "conversation"; conversation: ChatConversation; action: "updated" | "created" }
  | { type: "typing"; conversationId: string; name: string; state: "on" | "off"; at: string }
  | { type: "call"; conversationId: string; signal: CallSignal; at: string }
  | { type: "presence"; presence: ChatPresence[] };

type CreateChatInput = {
  kind: "direct" | "group" | "customer";
  memberIds?: string[];
  name?: string;
  createdBy?: { id?: string; name?: string };
};

export async function listChatConversations() {
  return api<ChatConversation[]>("/api/chat/conversations");
}

export async function getChatThread(id: string) {
  return api<ChatThread>(`/api/chat/conversations/${id}`);
}

export async function listChatTargets() {
  return api<ChatTarget[]>("/api/chat/targets");
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
  extra?: { senderName?: string; senderId?: string; kind?: "text" | "system" },
) {
  return api<ChatMessage>(`/api/chat/conversations/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ text, ...extra }),
  });
}

export async function sendChatTyping(
  id: string,
  state: "on" | "off",
  name?: string,
) {
  return api<{ ok: true }>(`/api/chat/conversations/${id}/typing`, {
    method: "POST",
    body: JSON.stringify({ name, state }),
  });
}

export async function sendCallSignal(
  id: string,
  signal: CallSignal,
  from?: { id?: string; name?: string },
) {
  return api<{ ok: true }>(`/api/chat/conversations/${id}/calls`, {
    method: "POST",
    body: JSON.stringify({ signal, from }),
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
) {
  return api<ChatConversation>(`/api/chat/conversations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}