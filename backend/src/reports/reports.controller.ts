import { Controller, Get, Query } from "@nestjs/common";
import { ReportsService } from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("x")
  xReport(@Query("day") day?: string) {
    return this.reports.xReport(day);
  }

  @Get("z")
  zReport(@Query("day") day?: string) {
    return this.reports.zReport(day);
  }

  @Get("tax")
  taxSummary(@Query("day") day?: string) {
    return this.reports.taxSummary(day);
  }
}
