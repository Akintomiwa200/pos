import { Module } from "@nestjs/common";
import { ConsoleModule } from "../console/console.module";
import { DbModule } from "../db/db.module";
import { SystemBackupController } from "./system-backup.controller";
import { SystemBackupService } from "./system-backup.service";

@Module({
  imports: [ConsoleModule, DbModule],
  controllers: [SystemBackupController],
  providers: [SystemBackupService],
})
export class SystemBackupModule {}
