import { Body, Controller, Delete, Get, Headers, Param, Post } from "@nestjs/common";
import { ConsoleService } from "./console.service";
import type { ConsoleAccount, ConsoleGroup } from "./console.types";

function bearer(header?: string) {
  return header?.replace(/^Bearer\s+/i, "").trim() ?? "";
}

@Controller("console")
export class ConsoleController {
  constructor(private readonly consoleService: ConsoleService) {}

  @Post("login")
  login(@Body() body: { email?: string; username?: string; password?: string }) {
    return this.consoleService.login(body.email ?? body.username ?? "", body.password ?? "");
  }

  @Post("register")
  register(
    @Body() body: { name?: string; email?: string; username?: string; password?: string },
  ) {
    return this.consoleService.register(body);
  }

  @Post("forgot-password")
  forgotPassword(@Body() body: { email?: string; username?: string }) {
    return this.consoleService.forgotPassword(body.email ?? body.username ?? "");
  }

  @Post("reset-password")
  resetPassword(@Body() body: { token?: string; password?: string }) {
    return this.consoleService.resetPassword(body.token ?? "", body.password ?? "");
  }

  @Get("me")
  me(@Headers("authorization") authorization?: string) {
    return this.consoleService.me(bearer(authorization));
  }

  @Post("logout")
  logout(@Headers("authorization") authorization?: string) {
    return this.consoleService.logout(bearer(authorization));
  }

  @Get("notifications")
  notifications(@Headers("authorization") authorization?: string) {
    this.consoleService.me(bearer(authorization));
    return this.consoleService.listNotifications();
  }

  @Post("notifications/read-all")
  readAllNotifications(@Headers("authorization") authorization?: string) {
    this.consoleService.me(bearer(authorization));
    return this.consoleService.markAllNoticesRead();
  }

  @Post("notifications/:id/read")
  readNotification(
    @Headers("authorization") authorization?: string,
    @Param("id") id?: string,
  ) {
    this.consoleService.me(bearer(authorization));
    return this.consoleService.markNoticeRead(id ?? "");
  }

  @Post("password")
  changePassword(
    @Headers("authorization") authorization?: string,
    @Body() body?: { current?: string; password?: string },
  ) {
    return this.consoleService.changePassword(
      bearer(authorization),
      body?.current ?? "",
      body?.password ?? "",
    );
  }

  @Get("groups")
  groups() {
    return this.consoleService.listGroups();
  }

  @Post("groups")
  saveGroup(@Body() body: ConsoleGroup) {
    return this.consoleService.saveGroup(body);
  }

  @Delete("groups/:id")
  deleteGroup(@Param("id") id: string) {
    return this.consoleService.deleteGroup(id);
  }

  @Get("accounts")
  accounts() {
    return this.consoleService.listAccounts();
  }

  @Post("accounts")
  saveAccount(@Body() body: Partial<ConsoleAccount>) {
    return this.consoleService.saveAccount(body);
  }

  @Delete("accounts/:id")
  deleteAccount(@Param("id") id: string) {
    return this.consoleService.deleteAccount(id);
  }

  @Get("tills")
  tills() {
    return this.consoleService.listTills();
  }

  @Post("tills")
  saveTill(
    @Body()
    body: {
      id?: string;
      name?: string;
      branchName?: string;
      product?: string;
      active?: boolean;
    },
  ) {
    return this.consoleService.saveTill(body);
  }

  @Post("tills/activate")
  activateTill(@Body() body: { code?: string; hardwareHex?: string }) {
    return this.consoleService.activateTill(body.code ?? "", body.hardwareHex ?? "");
  }

  @Post("tills/heartbeat")
  heartbeatTill(
    @Body() body: { code?: string; hardwareHex?: string; sessionToken?: string },
  ) {
    return this.consoleService.heartbeatTill(
      body.code ?? "",
      body.hardwareHex ?? "",
      body.sessionToken ?? "",
    );
  }

  @Post("tills/:id/regenerate")
  regenerateTill(@Param("id") id: string) {
    return this.consoleService.regenerateTillCode(id);
  }

  @Post("tills/:id/renew")
  renewTill(@Param("id") id: string) {
    return this.consoleService.renewTill(id);
  }

  @Delete("tills/:id")
  deleteTill(@Param("id") id: string) {
    return this.consoleService.deleteTill(id);
  }
}
