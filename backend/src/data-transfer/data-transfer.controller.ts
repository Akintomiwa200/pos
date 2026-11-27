import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { DataTransferService } from "./data-transfer.service";

@Controller("console/data-transfer")
export class DataTransferController {
  constructor(private readonly service: DataTransferService) {}

  /** Datasets with live counts — the export/import screens read this on load. */
  @Get("datasets")
  datasets() {
    return { datasets: this.service.datasets() };
  }

  @Post("import")
  import(
    @Body()
    body: {
      dataset?: string;
      rows?: Record<string, unknown>[];
      mode?: "update" | "skip";
    },
  ) {
    return this.service.importRows(body.dataset ?? "", body.rows ?? [], body.mode ?? "update");
  }
}
