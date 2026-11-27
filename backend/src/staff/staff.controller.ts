import { Body, Controller, Get, Headers, Post, Query } from "@nestjs/common";
import { StaffService } from "./staff.service";

@Controller("staff")
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  list() {
    return this.staff.list();
  }

  /** Only explicitly configured till users; Super Admin is never included. */
  @Get("login-roster")
  loginRoster() {
    return this.staff.listLoginRoster();
  }

  /** Authenticated by the current credential in the body; no bearer token needed. */
  @Post("pin/local")
  pinLocal(
    @Body()
    body: {
      staffId?: string;
      currentPassword?: string;
      currentPin?: string;
      pin?: string | null;
    },
  ) {
    return this.staff.managePinLocal(
      body.staffId ?? "",
      body.currentPassword,
      body.currentPin,
      body.pin === undefined ? null : body.pin,
    );
  }

  @Post("pin")
  pin(
    @Body() body: { staffId?: string; pin?: string | null },
    @Headers("authorization") authorization?: string,
  ) {
    return this.staff.managePin(
      body.staffId ?? "",
      body.pin === undefined ? null : body.pin,
      authorization,
    );
  }

  @Post("unlock")
  unlock(@Body() body: { pin?: string }) {
    return this.staff.unlock(body.pin ?? "");
  }

  /** Role-aware PIN authorisation for till gates such as Settings or supervisor actions. */
  @Post("authorize")
  authorize(
    @Body() body: { pin?: string; privilege?: "settings" | "unlock" },
  ) {
    return this.staff.authorizePrivilege(body.pin ?? "", body.privilege ?? "unlock");
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
  async close(@Body() body: { staffId?: string; pin?: string }) {
    const unlockedBy = await this.staff.authorize(body.staffId ?? "", body.pin ?? "");
    return { unlockedBy, shift: await this.staff.closeShift(body.staffId ?? "") };
  }

  @Post("shift/sale")
  sale(@Body() body: { staffId?: string; amountMinor?: number; isRefund?: boolean }) {
    return this.staff.addSale(body.staffId ?? "", body.amountMinor ?? 0, body.isRefund === true);
  }

  @Post("shift/print")
  async printShift(@Body() body: { pin?: string; staffId?: string }) {
    const unlockedBy = await this.staff.unlock(body.pin ?? "");
    return {
      unlockedBy,
      shift: await this.staff.currentShift(body.staffId ?? ""),
      kind: "shift",
    };
  }

  @Post("day/print")
  async printDay(@Body() body: { pin?: string }) {
    const unlockedBy = await this.staff.unlock(body.pin ?? "");
    return {
      unlockedBy,
      ...(await this.staff.dayStatus()),
      kind: "day",
    };
  }

  @Post("day/close")
  async closeDay(@Body() body: { pin?: string; staffId?: string }) {
    const unlockedBy = await this.staff.authorize(body.staffId ?? "", body.pin ?? "");
    return { unlockedBy, ...(await this.staff.closeDay()), kind: "day" };
  }
}