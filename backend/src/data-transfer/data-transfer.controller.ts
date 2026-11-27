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
      /** Base64-encoded .xlsx workbook; an alternative to sending already-parsed rows. */
      workbook?: {
        filename?: string;
        sheet?: string;
        data?: string;
      };
    },
  ) {
    await this.console.requireProducer(bearer(authorization));
    if (body.workbook) {
      return this.service.importWorkbook(body.dataset ?? "", body.workbook, body.mode ?? "update");
    }
    return this.service.importRows(body.dataset ?? "", body.rows ?? [], body.mode ?? "update");
  }
}
