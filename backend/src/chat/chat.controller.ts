import { Body, Controller, Get, Param, Patch, Post, Sse } from "@nestjs/common";
import { map, Observable } from "rxjs";
import { ChatService } from "./chat.service";
import type { ChatConversation, ChatEvent } from "./chat.types";

@Controller("chat")
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Sse("stream")
  stream(): Observable<{ data: ChatEvent }> {
    return this.chat.stream().pipe(map((data) => ({ data })));
  }

  @Get("conversations")
  list() {
    return this.chat.listConversations();
  }

  @Get("conversations/:id")
  thread(@Param("id") id: string) {
    return this.chat.getThread(id);
  }

  @Post("conversations/:id/messages")
  send(
    @Param("id") id: string,
    @Body() body: { text?: string; senderName?: string },
  ) {
    return this.chat.sendMessage(id, body ?? {});
  }

  @Patch("conversations/:id")
  patch(
    @Param("id") id: string,
    @Body() body: Partial<Pick<ChatConversation, "locationEnabled" | "active" | "location">>,
  ) {
    return this.chat.patchConversation(id, body ?? {});
  }
}
