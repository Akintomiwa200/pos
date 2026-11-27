import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { ConsoleService } from "../console/console.service";
import { RestoreResult, SystemBackupService } from "./system-backup.service";

function bearer(header?: string) {
  return header?.replace(/^Bearer\s+/i, "").trim() ?? "";
}

@Controller("console/backup")
export class SystemBackupController {
  constructor(
    private readonly service: SystemBackupService,
    private readonly console: ConsoleService,
  ) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  async create(@Headers("authorization") authorization?: string) {
    await this.console.requireProducer(bearer(authorization));
    return this.service.create();
  }

  @Post("restore")
  async restoreUpload(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<RestoreResult> {
    await this.console.requireProducer(bearer(authorization));
    return this.service.restore(undefined, body);
  }

  @Post(":id/restore")
  async restoreSaved(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
  ): Promise<RestoreResult> {
    await this.console.requireProducer(bearer(authorization));
    return this.service.restore(id);
  }
}
