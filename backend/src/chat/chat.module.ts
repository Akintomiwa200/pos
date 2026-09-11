import { Module } from "@nestjs/common";
import { ConsoleModule } from "../console/console.module";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";

@Module({
  imports: [ConsoleModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}