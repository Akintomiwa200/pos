import { api } from "./hq-api";

export type ChatMessage = {
  id: string;
  conversationId: string;
  sender: "customer" | "staff";
  senderName: string;
  body: string;
  at: string;
};

export type ChatConversation = {
  id: string;
  customerId?: string;
  name: string;
  avatar?: string;
  preview: string;
  updatedAt: string;
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

export type ChatEvent =
  | { type: "snapshot"; conversations: ChatConversation[] }
  | { type: "message"; message: ChatMessage; conversation: ChatConversation }
  | { type: "conversation"; conversation: ChatConversation; action: "updated" };

export async function listChatConversations() {
  return api<ChatConversation[]>("/api/chat/conversations");
}

export async function getChatThread(id: string) {
  return api<ChatThread>(`/api/chat/conversations/${id}`);
}

export async function sendChatMessage(id: string, text: string, senderName?: string) {
  return api<ChatMessage>(`/api/chat/conversations/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ text, senderName }),
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
