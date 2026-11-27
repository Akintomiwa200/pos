import { Module } from "@nestjs/common";
import { ConsoleModule } from "../console/console.module";
import { SystemBackupController } from "./system-backup.controller";
import { SystemBackupService } from "./system-backup.service";

@Module({
  imports: [ConsoleModule],
  controllers: [SystemBackupController],
  providers: [SystemBackupService],
})
export class SystemBackupModule {}
