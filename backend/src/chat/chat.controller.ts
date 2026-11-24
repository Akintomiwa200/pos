import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Sse } from "@nestjs/common";
import { map, Observable } from "rxjs";
import { ChatService } from "./chat.service";
import type { CallSignal, ChatConversation, ChatEvent } from "./chat.types";

function tokenFrom(authorization?: string, queryToken?: string) {
  return queryToken?.trim() || authorization?.replace(/^Bearer\s+/i, "").trim() || "";
}

@Controller("chat")
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Sse("stream")
  stream(
    @Query("viewerId") viewerId: string,
    @Query("token") token?: string,
    @Headers("authorization") authorization?: string,
  ): Observable<{ data: ChatEvent }> {
    return this.chat
      .stream(viewerId, tokenFrom(authorization, token))
      .pipe(map((data) => ({ data })));
  }

  @Get("targets")
  targets(
    @Query("viewerId") viewerId: string,
    @Headers("authorization") authorization?: string,
  ) {
    return this.chat.listChatTargets(viewerId, tokenFrom(authorization));
  }

  @Get("conversations")
  list(
    @Query("viewerId") viewerId: string,
    @Headers("authorization") authorization?: string,
  ) {
    return this.chat.listConversations(viewerId, tokenFrom(authorization));
  }

  @Get("conversations/:id")
  thread(
    @Param("id") id: string,
    @Query("viewerId") viewerId: string,
    @Headers("authorization") authorization?: string,
  ) {
    return this.chat.getThread(id, viewerId, tokenFrom(authorization));
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
    @Headers("authorization") authorization?: string,
  ) {
    return this.chat.createConversation({
      ...(body ?? {}),
      viewerId: body?.viewerId ?? "",
      token: tokenFrom(authorization),
    });
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
    @Headers("authorization") authorization?: string,
  ) {
    return this.chat.sendMessage(
      id,
      body ?? {},
      body?.viewerId ?? "",
      tokenFrom(authorization),
    );
  }

  @Patch("conversations/:id")
  patch(
    @Param("id") id: string,
    @Body()
    body: Partial<Pick<ChatConversation, "locationEnabled" | "active" | "location">> & {
      viewerId?: string;
    },
    @Headers("authorization") authorization?: string,
  ) {
    return this.chat.patchConversation(
      id,
      body ?? {},
      body?.viewerId ?? "",
      tokenFrom(authorization),
    );
  }

  @Post("conversations/:id/typing")
  typing(
    @Param("id") id: string,
    @Body() body: { name?: string; state?: "on" | "off"; viewerId?: string },
    @Headers("authorization") authorization?: string,
  ) {
    return this.chat.sendTyping(
      id,
      body ?? {},
      body?.viewerId ?? "",
      tokenFrom(authorization),
    );
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
    @Headers("authorization") authorization?: string,
  ) {
    return this.chat.relayCall(
      id,
      body ?? {},
      body?.viewerId ?? "",
      tokenFrom(authorization),
    );
  }

  @Post("presence")
  presence(
    @Body() body: { accountId?: string; name?: string },
    @Headers("authorization") authorization?: string,
  ) {
    return this.chat.touchPresence(
      body?.accountId ?? "",
      body?.name,
      tokenFrom(authorization),
    );
  }
}
