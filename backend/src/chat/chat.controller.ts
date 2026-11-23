import { Body, Controller, Get, Param, Patch, Post, Query, Sse } from "@nestjs/common";
import { map, Observable } from "rxjs";
import { ChatService } from "./chat.service";
import type { CallSignal, ChatConversation, ChatEvent } from "./chat.types";

@Controller("chat")
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Sse("stream")
  stream(@Query("viewerId") viewerId: string): Observable<{ data: ChatEvent }> {
    return this.chat.stream(viewerId).pipe(map((data) => ({ data })));
  }

  @Get("targets")
  targets(@Query("viewerId") viewerId: string) {
    return this.chat.listChatTargets(viewerId);
  }

  @Get("conversations")
  list(@Query("viewerId") viewerId: string) {
    return this.chat.listConversations(viewerId);
  }

  @Get("conversations/:id")
  thread(@Param("id") id: string, @Query("viewerId") viewerId: string) {
    return this.chat.getThread(id, viewerId);
  }

  @Post("conversations")
  create(
    @Body()
    body: {
      kind?: "direct" | "group" | "customer";
      memberIds?: string[];
      name?: string;
      createdBy?: { id?: string; name?: string };
      viewerId?: string;
    },
  ) {
    return this.chat.createConversation({ ...(body ?? {}), viewerId: body?.viewerId ?? "" });
  }

  @Post("conversations/:id/messages")
  send(
    @Param("id") id: string,
    @Body()
    body: {
      text?: string;
      senderName?: string;
      senderId?: string;
      kind?: "text" | "system";
      viewerId?: string;
    },
  ) {
    return this.chat.sendMessage(id, body ?? {}, body?.viewerId ?? "");
  }

  @Patch("conversations/:id")
  patch(
    @Param("id") id: string,
    @Body()
    body: Partial<Pick<ChatConversation, "locationEnabled" | "active" | "location">> & {
      viewerId?: string;
    },
  ) {
    return this.chat.patchConversation(id, body ?? {}, body?.viewerId ?? "");
  }

  @Post("conversations/:id/typing")
  typing(
    @Param("id") id: string,
    @Body() body: { name?: string; state?: "on" | "off"; viewerId?: string },
  ) {
    return this.chat.sendTyping(id, body ?? {}, body?.viewerId ?? "");
  }

  @Post("conversations/:id/calls")
  call(
    @Param("id") id: string,
    @Body()
    body: {
      signal?: CallSignal;
      from?: { id?: string; name?: string };
      viewerId?: string;
    },
  ) {
    return this.chat.relayCall(id, body ?? {}, body?.viewerId ?? "");
  }

  @Post("presence")
  presence(@Body() body: { accountId?: string; name?: string }) {
    return this.chat.touchPresence(body.accountId ?? "", body.name);
  }
}
