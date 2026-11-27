import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Res,
  Sse,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { memoryStorage } from "multer";
import { map, Observable } from "rxjs";
import {
  contentDisposition,
  MAX_CHAT_ATTACHMENT_BYTES,
} from "../uploads/chat-attachments";
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

  @Delete("conversations/:id")
  removeConversation(
    @Param("id") id: string,
    @Query("viewerId") viewerId: string,
    @Body() body: { viewerId?: string } | undefined,
    @Headers("authorization") authorization?: string,
  ) {
    return this.chat.deleteConversation(
      id,
      body?.viewerId || viewerId,
      tokenFrom(authorization),
    );
  }

  /** Multipart upload; the returned id is claimed by sending a chat message. */
  @Post("files")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: MAX_CHAT_ATTACHMENT_BYTES, files: 1 },
    }),
  )
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { viewerId?: string },
    @Query("viewerId") queryViewerId?: string,
    @Headers("authorization") authorization?: string,
  ) {
    return this.chat.uploadAttachment(
      file,
      body?.viewerId || queryViewerId || "",
      tokenFrom(authorization),
    );
  }

  @Delete("files/:id")
  removeFile(
    @Param("id") id: string,
    @Body() body: { viewerId?: string } | undefined,
    @Query("viewerId") queryViewerId?: string,
    @Headers("authorization") authorization?: string,
  ) {
    return this.chat.removeAttachment(
      id,
      body?.viewerId || queryViewerId || "",
      tokenFrom(authorization),
    );
  }

  /** <img>/new-tab friendly: viewerId + token query params work like the SSE route. */
  @Get("files/:id")
  async downloadFile(
    @Param("id") id: string,
    @Query("viewerId") viewerId: string,
    @Query("token") token: string | undefined,
    @Headers("authorization") authorization: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { record, buffer } = await this.chat.getAttachmentFile(
      id,
      viewerId,
      tokenFrom(authorization, token),
    );
    response.setHeader("Content-Type", record.mimeType);
    response.setHeader("Content-Length", buffer.length);
    response.setHeader(
      "Content-Disposition",
      contentDisposition(record.name, record.mimeType.startsWith("image/")),
    );
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    return buffer;
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
      attachmentIds?: string[];
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
