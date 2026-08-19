import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { StaffService } from "./staff.service";

@Controller("staff")
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  list() {
    return this.staff.list();
  }

  @Post("unlock")
  unlock(@Body() body: { pin?: string }) {
    return this.staff.unlock(body.pin ?? "");
  }

  @Get("shift")
  shift(@Query("staffId") staffId = "") {
    return this.staff.currentShift(staffId);
  }

  @Post("shift/open")
  open(@Body() body: { staffId?: string }) {
    return this.staff.openShift(body.staffId ?? "");
  }

  @Post("shift/close")
  close(@Body() body: { staffId?: string; pin?: string }) {
    this.staff.unlock(body.pin ?? "");
    return this.staff.closeShift(body.staffId ?? "");
  }

  @Post("shift/sale")
  sale(@Body() body: { staffId?: string; amountMinor?: number }) {
    return this.staff.addSale(body.staffId ?? "", body.amountMinor ?? 0);
  }

  @Post("shift/print")
  printShift(@Body() body: { pin?: string; staffId?: string }) {
    const unlockedBy = this.staff.unlock(body.pin ?? "");
    return {
      unlockedBy,
      shift: this.staff.currentShift(body.staffId ?? ""),
      kind: "shift",
    };
  }

  @Post("day/print")
  printDay(@Body() body: { pin?: string }) {
    const unlockedBy = this.staff.unlock(body.pin ?? "");
    return {
      unlockedBy,
      ...this.staff.dayStatus(),
      kind: "day",
    };
  }

  @Post("day/close")
  closeDay(@Body() body: { pin?: string }) {
    const unlockedBy = this.staff.unlock(body.pin ?? "");
    return { unlockedBy, ...this.staff.closeDay(), kind: "day" };
  }
}
