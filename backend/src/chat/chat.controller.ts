import { Body, Controller, Get, Param, Patch, Post, Sse } from "@nestjs/common";
import { map, Observable } from "rxjs";
import { ChatService } from "./chat.service";
import type { CallSignal, ChatConversation, ChatEvent } from "./chat.types";

@Controller("chat")
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Sse("stream")
  stream(): Observable<{ data: ChatEvent }> {
    return this.chat.stream().pipe(map((data) => ({ data })));
  }

  @Get("targets")
  targets() {
    return this.chat.listChatTargets();
  }

  @Get("conversations")
  list() {
    return this.chat.listConversations();
  }

  @Get("conversations/:id")
  thread(@Param("id") id: string) {
    return this.chat.getThread(id);
  }

  @Post("conversations")
  create(
    @Body()
    body: {
      kind?: "direct" | "group" | "customer";
      memberIds?: string[];
      name?: string;
      createdBy?: { id?: string; name?: string };
    },
  ) {
    return this.chat.createConversation(body ?? {});
  }

  @Post("conversations/:id/messages")
  send(
    @Param("id") id: string,
    @Body() body: { text?: string; senderName?: string; senderId?: string; kind?: "text" | "system" },
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

  @Post("conversations/:id/typing")
  typing(
    @Param("id") id: string,
    @Body() body: { name?: string; state?: "on" | "off" },
  ) {
    return this.chat.sendTyping(id, body ?? {});
  }

  @Post("conversations/:id/calls")
  call(
    @Param("id") id: string,
    @Body() body: { signal?: CallSignal; from?: { id?: string; name?: string } },
  ) {
    return this.chat.relayCall(id, body ?? {});
  }

  @Post("presence")
  presence(@Body() body: { accountId?: string; name?: string }) {
    return this.chat.touchPresence(body.accountId ?? "", body.name);
  }
}