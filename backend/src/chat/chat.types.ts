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

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const todayAt = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const SEED_CONVERSATIONS: ChatConversation[] = [
  {
    id: "chat-floyd",
    name: "Floyd Miles",
    avatar: "https://i.pravatar.cc/150?u=floyd-miles",
    preview: "Thanks for letting me know about the pack size.",
    updatedAt: ago(0),
    active: true,
    locationEnabled: true,
    location: "Lekki Phase 1, Lagos",
    totalOrders: 18,
    totalBuyMinor: 420_500_00,
    purchased: [
      {
        id: "p1",
        name: "Chivita Pack",
        image: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=200&q=80",
      },
      {
        id: "p2",
        name: "Burger Combo",
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&q=80",
      },
      {
        id: "p3",
        name: "Waffle",
        image: "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=200&q=80",
      },
    ],
  },
  {
    id: "chat-jenny",
    name: "Jenny Wilson",
    avatar: "https://i.pravatar.cc/150?u=jenny-wilson",
    preview: "Can I get the carton delivered today?",
    updatedAt: ago(1),
    active: true,
    locationEnabled: true,
    location: "Victoria Island, Lagos",
    totalOrders: 42,
    totalBuyMinor: 1_285_000_00,
    purchased: [
      {
        id: "p4",
        name: "Salad Bowl",
        image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=200&q=80",
      },
      {
        id: "p5",
        name: "Berry Tart",
        image: "https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?auto=format&fit=crop&w=200&q=80",
      },
      {
        id: "p6",
        name: "Iced Coffee",
        image: "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=200&q=80",
      },
      {
        id: "p7",
        name: "Fries",
        image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=200&q=80",
      },
      {
        id: "p8",
        name: "Wrap",
        image: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=200&q=80",
      },
      {
        id: "p9",
        name: "Smoothie",
        image: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=200&q=80",
      },
      {
        id: "p10",
        name: "Donut",
        image: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=200&q=80",
      },
      {
        id: "p11",
        name: "Pizza Slice",
        image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=200&q=80",
      },
      {
        id: "p12",
        name: "Water Pack",
        image: "https://images.unsplash.com/photo-1548839140-29a7492991bd?auto=format&fit=crop&w=200&q=80",
      },
    ],
  },
  {
    id: "chat-devon",
    name: "Devon Lane",
    avatar: "https://i.pravatar.cc/150?u=devon-lane",
    preview: "Payment went through on transfer.",
    updatedAt: ago(6),
    active: false,
    locationEnabled: false,
    location: "Ikeja, Lagos",
    totalOrders: 9,
    totalBuyMinor: 96_000_00,
    purchased: [
      {
        id: "p13",
        name: "Indomie Carton",
        image: "https://images.unsplash.com/photo-1612929632977-3a0d0a4a1c0b?auto=format&fit=crop&w=200&q=80",
      },
    ],
  },
  {
    id: "chat-jane",
    name: "Jane Cooper",
    avatar: "https://i.pravatar.cc/150?u=jane-cooper",
    preview: "Please hold my order until 4pm.",
    updatedAt: ago(18),
    active: false,
    locationEnabled: true,
    location: "Yaba, Lagos",
    totalOrders: 27,
    totalBuyMinor: 610_200_00,
    purchased: [],
  },
  {
    id: "chat-leslie",
    name: "Leslie Alexander",
    avatar: "https://i.pravatar.cc/150?u=leslie-alexander",
    preview: "Is the loyalty card ready?",
    updatedAt: ago(42),
    active: false,
    locationEnabled: false,
    location: "Surulere, Lagos",
    totalOrders: 5,
    totalBuyMinor: 48_500_00,
    purchased: [],
  },
];

export const SEED_MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    conversationId: "chat-jenny",
    sender: "customer",
    senderName: "Jenny Wilson",
    body: "Hi — I ordered the Chivita pack of 12 yesterday. Can it still be delivered today?",
    at: todayAt(11, 25),
  },
  {
    id: "m2",
    conversationId: "chat-jenny",
    sender: "staff",
    senderName: "You",
    body: "Yes, we can send it with the afternoon run. Same address on Victoria Island?",
    at: todayAt(11, 28),
  },
  {
    id: "m3",
    conversationId: "chat-jenny",
    sender: "customer",
    senderName: "Jenny Wilson",
    body: "That's right. Also add one more salad bowl if you have stock.",
    at: todayAt(11, 32),
  },
  {
    id: "m4",
    conversationId: "chat-jenny",
    sender: "staff",
    senderName: "You",
    body: "Added. Pack barcode ends in 0017 — we'll scan it at dispatch.",
    at: todayAt(11, 35),
  },
  {
    id: "m5",
    conversationId: "chat-floyd",
    sender: "customer",
    senderName: "Floyd Miles",
    body: "Thanks for letting me know about the pack size.",
    at: ago(2),
  },
  {
    id: "m6",
    conversationId: "chat-floyd",
    sender: "staff",
    senderName: "You",
    body: "Anytime — each pack is 12 pieces on the till.",
    at: ago(1),
  },
];
