import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { createReadStream } from "node:fs";
import { memoryStorage } from "multer";
import { ConsoleService } from "../console/console.service";
import { MAX_SQL_BYTES } from "./postgres-backup";
import {
  RestoreResult,
  SqlRestoreResult,
  SystemBackupService,
} from "./system-backup.service";

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

  @Get(":id/sql")
  async downloadSql(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
  ) {
    await this.console.requireProducer(bearer(authorization));
    const file = await this.service.sqlDownload(id);
    return new StreamableFile(createReadStream(file.path), {
      type: "text/plain; charset=utf-8",
      disposition: `attachment; filename="${file.filename}"`,
      length: file.size,
    });
  }

  @Post("sql/:id/restore")
  async restoreSqlSaved(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
  ): Promise<SqlRestoreResult> {
    await this.console.requireProducer(bearer(authorization));
    return this.service.restoreSqlSaved(id);
  }

  @Post("restore-sql")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: MAX_SQL_BYTES },
      fileFilter: (_request, file, callback) => {
        if (!file.originalname.toLowerCase().endsWith(".sql")) {
          callback(
            new BadRequestException("SQL backup file must have a .sql extension"),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async restoreSqlUpload(
    @Headers("authorization") authorization: string | undefined,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<SqlRestoreResult> {
    await this.console.requireProducer(bearer(authorization));
    if (!file) throw new BadRequestException("Upload a .sql backup file");
    return this.service.restoreSqlUpload(file.originalname, file.buffer);
  }
}
