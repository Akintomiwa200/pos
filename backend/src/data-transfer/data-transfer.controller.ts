import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { ConsoleService } from "../console/console.service";
import { DataTransferService } from "./data-transfer.service";

function bearer(header?: string) {
  return header?.replace(/^Bearer\s+/i, "").trim() ?? "";
}

@Controller("console/data-transfer")
export class DataTransferController {
  constructor(
    private readonly service: DataTransferService,
    private readonly console: ConsoleService,
  ) {}

  /** Live row counts for the static dataset catalogue used by the web screens. */
  @Get("datasets")
  async datasets() {
    return { datasets: await this.service.datasets() };
  }

  @Post("import")
  async import(
    @Headers("authorization") authorization: string | undefined,
    @Body()
    body: {
      dataset?: string;
      rows?: Record<string, unknown>[];
      mode?: "update" | "skip";
    },
  ) {
    await this.console.requireProducer(bearer(authorization));
    return this.service.importRows(body.dataset ?? "", body.rows ?? [], body.mode ?? "update");
  }
}
