import { Controller, Get, Query, Sse } from "@nestjs/common";
import { map, Observable } from "rxjs";
import { ReportsService, type AuditEvent } from "./reports.service";

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

  @Get("audit")
  audit(@Query("day") day?: string) {
    return this.reports.auditSnapshot(day);
  }

  @Sse("audit/stream")
  auditStream(): Observable<{ data: AuditEvent }> {
    return this.reports.auditStream().pipe(map((data) => ({ data })));
  }
}
