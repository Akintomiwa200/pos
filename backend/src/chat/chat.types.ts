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
  /** Account ids that participate in a direct/group chat. Empty for customer chats. */
  memberIds: string[];
  /** Account id that created a direct/group chat. */
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

/** A person you can start a new direct or group chat with (console account). */
export type ChatTarget = {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  groupName?: string;
};

/** A person online right now (SSE heartbeat). */
export type ChatPresence = {
  accountId: string;
  name: string;
  at: string;
};

export type CallMode = "audio" | "video";

type CallPeer = { id: string; name: string };

/** WebRTC signalling messages relayed through the conversation stream. */
export type CallSignal =
  | { type: "ring" | "cancel" | "end" | "accept" | "decline"; from: CallPeer; mode: CallMode }
  | { type: "offer" | "answer"; from: CallPeer; mode: CallMode; sdp: { type: string; sdp: string } }
  | {
      type: "candidate";
      from: CallPeer;
      candidate: { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null };
    }
  | { type: "switch"; from: CallPeer; mode: CallMode };

export type ChatEvent =
  | { type: "snapshot"; conversations: ChatConversation[]; presence: ChatPresence[] }
  | { type: "message"; message: ChatMessage; conversation: ChatConversation }
  | { type: "conversation"; conversation: ChatConversation; action: "updated" | "created" }
  | { type: "typing"; conversationId: string; name: string; state: "on" | "off"; at: string }
  | { type: "call"; conversationId: string; signal: CallSignal; at: string }
  | { type: "presence"; presence: ChatPresence[] };