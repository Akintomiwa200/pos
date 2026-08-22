import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { CatalogService, type CatalogRow } from "../catalog/catalog.service";
import { MAX_PRODUCT_IMAGE_BYTES } from "../catalog/cloudinary.service";
import { ConsoleService } from "./console.service";
import { SetupService } from "./setup.service";
import type { ConsoleAccount, ConsoleGroup } from "./console.types";
import type {
  HqBranch,
  HqCompany,
  HqGateway,
  HqOrgSettings,
  HqStore,
  HqStorefront,
  HqTax,
} from "./setup.types";

function bearer(header?: string) {
  return header?.replace(/^Bearer\s+/i, "").trim() ?? "";
}

@Controller("console")
export class ConsoleController {
  constructor(
    private readonly consoleService: ConsoleService,
    private readonly setup: SetupService,
    private readonly catalog: CatalogService,
  ) {}

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
  async activateTill(@Body() body: { code?: string; hardwareHex?: string }) {
    const till = await this.consoleService.activateTill(body.code ?? "", body.hardwareHex ?? "");
    return { ...till, org: this.setup.snapshot() };
  }

  @Post("tills/heartbeat")
  async heartbeatTill(
    @Body() body: { code?: string; hardwareHex?: string; sessionToken?: string },
  ) {
    const till = await this.consoleService.heartbeatTill(
      body.code ?? "",
      body.hardwareHex ?? "",
      body.sessionToken ?? "",
    );
    return { ...till, org: this.setup.snapshot() };
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

  @Get("setup")
  setupSnapshot() {
    return this.setup.snapshot();
  }

  @Get("setup/company")
  company() {
    return this.setup.getCompany();
  }

  @Post("setup/company")
  saveCompany(@Body() body: Partial<HqCompany>) {
    return this.setup.saveCompany(body);
  }

  @Get("setup/branches")
  branches() {
    return this.setup.listBranches();
  }

  @Post("setup/branches")
  saveBranch(@Body() body: Partial<HqBranch>) {
    return this.setup.saveBranch(body);
  }

  @Delete("setup/branches/:id")
  deleteBranch(@Param("id") id: string) {
    return this.setup.deleteBranch(id);
  }

  @Get("setup/stores")
  stores() {
    return this.setup.listStores();
  }

  @Post("setup/stores")
  saveStore(@Body() body: Partial<HqStore>) {
    return this.setup.saveStore(body);
  }

  @Delete("setup/stores/:id")
  deleteStore(@Param("id") id: string) {
    return this.setup.deleteStore(id);
  }

  @Get("setup/storefronts")
  storefronts() {
    return this.setup.listStorefronts();
  }

  @Post("setup/storefronts")
  saveStorefront(@Body() body: Partial<HqStorefront>) {
    return this.setup.saveStorefront(body);
  }

  @Delete("setup/storefronts/:id")
  deleteStorefront(@Param("id") id: string) {
    return this.setup.deleteStorefront(id);
  }

  @Get("setup/gateways")
  gateways() {
    return this.setup.listGateways();
  }

  @Post("setup/gateways")
  saveGateway(@Body() body: Partial<HqGateway>) {
    return this.setup.saveGateway(body);
  }

  @Delete("setup/gateways/:id")
  deleteGateway(@Param("id") id: string) {
    return this.setup.deleteGateway(id);
  }

  @Get("setup/taxes")
  taxes() {
    return this.setup.listTaxes();
  }

  @Post("setup/taxes")
  saveTax(@Body() body: Partial<HqTax>) {
    return this.setup.saveTax(body);
  }

  @Delete("setup/taxes/:id")
  deleteTax(@Param("id") id: string) {
    return this.setup.deleteTax(id);
  }

  @Get("setup/settings")
  settings() {
    return this.setup.getSettings();
  }

  @Post("setup/settings")
  saveSettings(@Body() body: Partial<HqOrgSettings>) {
    return this.setup.saveSettings(body);
  }

  @Get("setup/data")
  async data() {
    const counts = await this.setup.counts();
    return {
      ...counts,
      tills: this.consoleService.listTills().length,
      catalog: this.catalog.list().length,
    };
  }

  @Post("setup/data/purge-catalog")
  purgeCatalog() {
    return this.catalog.resetToSeed();
  }

  @Post("setup/import/catalog")
  importCatalog(@Body() body: { rows?: CatalogRow[] }) {
    return this.catalog.upsertMany(body.rows ?? []);
  }

  @Post("setup/catalog/items/:id/image")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PRODUCT_IMAGE_BYTES, files: 1 },
    }),
  )
  uploadCatalogImage(@Param("id") id: string, @UploadedFile() file: Express.Multer.File) {
    return this.catalog.uploadImage(id, file);
  }

  @Get("setup/export")
  async exportSetup(@Query("kind") kind = "org") {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    let sales: unknown[] = [];
    try {
      const raw = await readFile(join(process.cwd(), "data", "sales.json"), "utf8");
      const parsed = JSON.parse(raw) as unknown[];
      sales = Array.isArray(parsed) ? parsed : [];
    } catch {
      sales = [];
    }
    return this.setup.exportBundle(kind, {
      catalog: this.catalog.list(),
      sales,
    });
  }
}
