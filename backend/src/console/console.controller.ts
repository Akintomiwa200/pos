import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ConsoleService } from "./console.service";
import type { ConsoleAccount, ConsoleGroup } from "./console.types";

@Controller("console")
export class ConsoleController {
  constructor(private readonly consoleService: ConsoleService) {}

  @Post("login")
  login(@Body() body: { email?: string; username?: string; password?: string }) {
    return this.consoleService.login(body.email ?? body.username ?? "", body.password ?? "");
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
