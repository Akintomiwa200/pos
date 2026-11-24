import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Sse,
  UploadedFile,
  UnauthorizedException,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { map, Observable } from "rxjs";
import { CatalogService, type CatalogRow } from "../catalog/catalog.service";
import { CloudinaryService, MAX_PRODUCT_IMAGE_BYTES } from "../catalog/cloudinary.service";
import { ConsoleService, type BillingEvent, type BillingPlan, type DirectoryEvent, type NoticesEvent, type PosEvent, type SecurityFeedEvent, type SessionStreamEvent } from "./console.service";
import { SetupService, type SettingsEvent } from "./setup.service";
import type { ConsoleAccount, ConsoleGroup, GroupScope } from "./console.types";
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
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Post("login")
  login(@Body() body: { email?: string; username?: string; password?: string }) {
    return this.consoleService.login(body.email ?? body.username ?? "", body.password ?? "");
  }

  @Get("auth/google-config")
  googleConfig() {
    return this.consoleService.googleConfig();
  }

  @Post("auth/google")
  googleAuth(
    @Body()
    body: {
      credential?: string;
      intent?: "login" | "signup";
      company?: Partial<HqCompany>;
    },
  ) {
    return this.consoleService.googleAuth(body);
  }

  @Post("register")
  register(
    @Body() body: { name?: string; email?: string; username?: string; password?: string },
  ) {
    return this.consoleService.register(body);
  }

  @Post("register-company")
  registerCompany(
    @Body()
    body: {
      company?: Partial<HqCompany>;
      account?: {
        name?: string;
        email?: string;
        username?: string;
        password?: string;
      };
    },
  ) {
    return this.consoleService.registerCompany(body);
  }

  @Post("admin/companies")
  provisionCompany(
    @Headers("authorization") authorization: string,
    @Body()
    body: {
      company?: Partial<HqCompany>;
      account?: {
        name?: string;
        email?: string;
        username?: string;
        password?: string;
      };
    },
  ) {
    return this.consoleService.provisionCompany(bearer(authorization), body);
  }

  @Post("forgot-password")
  forgotPassword(@Body() body: { email?: string; username?: string }) {
    return this.consoleService.forgotPassword(body.email ?? body.username ?? "");
  }

  @Post("reset-password")
  resetPassword(@Body() body: { token?: string; password?: string }) {
    return this.consoleService.resetPassword(body.token ?? "", body.password ?? "");
  }

  @Get("verify-email")
  verifyEmail(@Query("token") token?: string) {
    return this.consoleService.verifyEmail(token ?? "");
  }

  @Post("verify-email/resend")
  resendVerification(@Body() body: { email?: string; username?: string }) {
    return this.consoleService.resendVerification(body.email ?? body.username ?? "");
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
  async notifications(@Headers("authorization") authorization?: string) {
    const me = await this.consoleService.me(bearer(authorization));
    return this.consoleService.listNotifications({
      isSuperAdmin: Boolean(me.user.isSuperAdmin),
      companyId: me.user.companyId,
    });
  }

  @Post("notifications/read-all")
  async readAllNotifications(@Headers("authorization") authorization?: string) {
    const me = await this.consoleService.me(bearer(authorization));
    return this.consoleService.markAllNoticesRead({
      isSuperAdmin: Boolean(me.user.isSuperAdmin),
      companyId: me.user.companyId,
    });
  }

  @Post("notifications/:id/read")
  async readNotification(
    @Headers("authorization") authorization?: string,
    @Param("id") id?: string,
  ) {
    const me = await this.consoleService.me(bearer(authorization));
    return this.consoleService.markNoticeRead(id ?? "", {
      isSuperAdmin: Boolean(me.user.isSuperAdmin),
      companyId: me.user.companyId,
    });
  }

  @Sse("notifications/stream")
  async notificationsStream(
    @Query("token") token?: string,
    @Headers("authorization") authorization?: string,
  ): Promise<Observable<{ data: NoticesEvent }>> {
    const me = await this.consoleService.me(token?.trim() || bearer(authorization));
    return this.consoleService
      .noticesStream({
        isSuperAdmin: Boolean(me.user.isSuperAdmin),
        companyId: me.user.companyId,
      })
      .pipe(map((data) => ({ data })));
  }

  @Sse("session/stream")
  async sessionStream(
    @Query("token") token?: string,
    @Headers("authorization") authorization?: string,
  ): Promise<Observable<{ data: SessionStreamEvent }>> {
    const me = await this.consoleService.me(token?.trim() || bearer(authorization));
    return this.consoleService
      .sessionStream({
        accountId: me.user.id,
        isSuperAdmin: Boolean(me.user.isSuperAdmin),
      })
      .pipe(map((data) => ({ data })));
  }

  @Sse("security/stream")
  async securityStream(
    @Query("token") token?: string,
    @Headers("authorization") authorization?: string,
  ): Promise<Observable<{ data: SecurityFeedEvent }>> {
    await this.consoleService.requireProducer(token?.trim() || bearer(authorization));
    return this.consoleService.securityStream().pipe(map((data) => ({ data })));
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

  @Post("profile")
  updateProfile(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: { name?: string; username?: string },
  ) {
    return this.consoleService.updateOwnProfile(bearer(authorization), body ?? {});
  }

  @Post("profile/avatar")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PRODUCT_IMAGE_BYTES, files: 1 },
    }),
  )
  async uploadProfileAvatar(
    @Headers("authorization") authorization: string | undefined,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const token = bearer(authorization);
    const me = await this.consoleService.me(token);
    const url = await this.cloudinary.uploadAvatar(file, me.user.id);
    return this.consoleService.setOwnAvatar(token, url);
  }

  @Delete("profile/avatar")
  removeProfileAvatar(@Headers("authorization") authorization?: string) {
    return this.consoleService.setOwnAvatar(bearer(authorization), null);
  }

  @Post("session/unlock")
  unlockSession(
    @Headers("authorization") authorization?: string,
    @Body() body?: { password?: string },
  ) {
    return this.consoleService.unlockSession(bearer(authorization), body?.password ?? "");
  }

  @Get("security/logins")
  loginHistory(
    @Headers("authorization") authorization?: string,
    @Query("limit") limit?: string,
  ) {
    return this.consoleService.tenantLoginHistory(bearer(authorization), Number(limit ?? 50));
  }

  @Get("security/sessions")
  securitySessions(@Headers("authorization") authorization?: string) {
    return this.consoleService.tenantSessions(bearer(authorization));
  }

  @Post("security/sessions/revoke")
  revokeSession(
    @Headers("authorization") authorization?: string,
    @Body() body?: { accountId?: string },
  ) {
    return this.consoleService.revokeSessions(bearer(authorization), body?.accountId);
  }

  @Get("security/events")
  securityEvents(
    @Headers("authorization") authorization?: string,
    @Query("limit") limit?: string,
  ) {
    return this.consoleService.tenantSecurityEvents(bearer(authorization), Number(limit ?? 50));
  }

  @Get("security/audit")
  securityAudit(
    @Headers("authorization") authorization?: string,
    @Query("limit") limit?: string,
  ) {
    return this.consoleService.tenantAuditLog(bearer(authorization), Number(limit ?? 50));
  }

  @Get("groups")
  async groups(@Headers("authorization") authorization?: string) {
    const me = await this.consoleService.me(bearer(authorization)).catch(() => null);
    const groups = await this.consoleService.listGroups();
    if (me?.user.isSuperAdmin) return groups;
    if (!me) throw new UnauthorizedException("Sign in again");
    return groups.filter((group) => (group.scope ?? "tenant") === "tenant");
  }

  @Post("groups")
  async saveGroup(
    @Body() body: ConsoleGroup,
    @Headers("authorization") authorization?: string,
  ) {
    let actorScope: GroupScope | undefined;
    try {
      const me = await this.consoleService.me(bearer(authorization));
      actorScope = me.user.isSuperAdmin ? "producer" : "tenant";
    } catch {
      actorScope = undefined;
    }
    return this.consoleService.saveGroup(body, { actorScope });
  }

  @Delete("groups/:id")
  deleteGroup(@Param("id") id: string) {
    return this.consoleService.deleteGroup(id);
  }

  @Get("accounts")
  async accounts(@Headers("authorization") authorization?: string) {
    const me = await this.consoleService.me(bearer(authorization)).catch(() => null);
    if (!me) throw new UnauthorizedException("Sign in again");
    return this.consoleService.listAccounts(
      me.user.isSuperAdmin ? undefined : { companyId: me.user.companyId ?? "__none__" },
    );
  }

  @Sse("directory/stream")
  async directoryStream(
    @Query("token") token?: string,
    @Headers("authorization") authorization?: string,
  ): Promise<Observable<{ data: DirectoryEvent }>> {
    const me = await this.consoleService.me(token?.trim() || bearer(authorization));
    return this.consoleService
      .directoryStream({
        isSuperAdmin: Boolean(me.user.isSuperAdmin),
        companyId: me.user.companyId,
      })
      .pipe(map((data) => ({ data })));
  }

  @Post("accounts")
  async saveAccount(
    @Body() body: Partial<ConsoleAccount>,
    @Headers("authorization") authorization?: string,
  ) {
    const me = await this.consoleService.me(bearer(authorization)).catch(() => null);
    if (!me) throw new UnauthorizedException("Sign in again");
    const isSuperAdmin = Boolean(me.user.isSuperAdmin);
    return this.consoleService.saveAccount(body, {
      invitedBy: me.user.name,
      actorScope: isSuperAdmin ? "producer" : "tenant",
      actorIsSuperAdmin: isSuperAdmin,
      actorCompanyId: isSuperAdmin ? undefined : (me.user.companyId ?? null),
      companyId: isSuperAdmin ? (body.companyId ?? undefined) : undefined,
      welcomePassword: body.password?.trim() || undefined,
    });
  }

  @Delete("accounts/:id")
  async deleteAccount(
    @Param("id") id: string,
    @Headers("authorization") authorization?: string,
  ) {
    const me = await this.consoleService.me(bearer(authorization)).catch(() => null);
    if (!me) throw new UnauthorizedException("Sign in again");
    return this.consoleService.deleteAccount(id, {
      isSuperAdmin: Boolean(me.user.isSuperAdmin),
      companyId: me.user.companyId ?? null,
    });
  }

  @Get("security/overview")
  async securityOverview(@Headers("authorization") authorization: string) {
    await this.consoleService.requireProducer(bearer(authorization));
    return this.consoleService.securityOverview();
  }

  @Get("tills")
  tills() {
    return this.consoleService.listTills();
  }

  @Sse("pos/stream")
  posStream(): Observable<{ data: PosEvent }> {
    return this.consoleService.posStream().pipe(map((data) => ({ data })));
  }

  @Get("billing")
  billing() {
    return this.consoleService.billingSnapshot();
  }

  @Get("billing/plans")
  billingPlans() {
    return this.consoleService.listPlans();
  }

  @Post("billing/plans")
  async saveBillingPlan(
    @Headers("authorization") authorization: string,
    @Body() body: Partial<BillingPlan>,
  ) {
    await this.consoleService.requireProducer(bearer(authorization));
    return this.consoleService.savePlan(body);
  }

  @Delete("billing/plans/:id")
  async deleteBillingPlan(
    @Headers("authorization") authorization: string,
    @Param("id") id: string,
  ) {
    await this.consoleService.requireProducer(bearer(authorization));
    return this.consoleService.deletePlan(id);
  }

  @Get("billing/subscriptions")
  billingSubscriptions() {
    return this.consoleService.listSubscriptions();
  }

  @Post("billing/subscriptions/assign")
  async assignBillingSubscription(
    @Headers("authorization") authorization: string,
    @Body()
    body: { companyId?: string; planId?: string; status?: string; autoRenew?: boolean },
  ) {
    await this.consoleService.requireProducer(bearer(authorization));
    return this.consoleService.assignSubscription(
      body.companyId ?? "",
      body.planId ?? "",
      { status: body.status, autoRenew: body.autoRenew },
    );
  }

  @Get("billing/invoices")
  billingInvoices() {
    return this.consoleService.listInvoices();
  }

  @Post("billing/invoices/:id/pay")
  markBillingInvoicePaid(
    @Param("id") id: string,
    @Body()
    body: { reference?: string; provider?: string; amountMinor?: number },
  ) {
    return this.consoleService.markInvoicePaid(id, body);
  }

  @Get("billing/payments")
  billingPayments() {
    return this.consoleService.listPayments();
  }

  @Sse("billing/stream")
  billingStream(): Observable<{ data: BillingEvent }> {
    return this.consoleService.billingStream().pipe(map((data) => ({ data })));
  }

  @Post("tills")
  saveTill(
    @Body()
    body: {
      id?: string;
      name?: string;
      storeId?: string;
      branchId?: string;
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

  @Post("tills/:id/unpair")
  unpairTill(@Param("id") id: string) {
    return this.consoleService.unpairTill(id);
  }

  @Post("tills/:id/renew")
  renewTill(@Param("id") id: string) {
    return this.consoleService.renewTill(id);
  }

  @Post("tills/:id/renew/pay")
  renewTillWithPayment(
    @Param("id") id: string,
    @Body()
    body: { reference?: string; provider?: string; amountMinor?: number; currency?: string },
  ) {
    return this.consoleService.renewTillWithPayment(id, body);
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
  async saveCompany(@Body() body: Partial<HqCompany>) {
    const saved = await this.setup.saveCompany(body);
    await this.consoleService.recordActivity({
      action: "company.save",
      target: saved.name,
      detail: Object.keys(body).join(", "),
    });
    return saved;
  }

  @Post("setup/company/image")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PRODUCT_IMAGE_BYTES, files: 1 },
    }),
  )
  async uploadCompanyImage(@UploadedFile() file: Express.Multer.File) {
    const company = this.setup.getCompany();
    const logoUrl = await this.cloudinary.uploadCompanyLogo(file, company.id);
    const saved = await this.setup.saveCompany({ logoUrl });
    await this.consoleService.recordActivity({
      action: "company.image",
      target: saved.name,
      detail: "logo",
    });
    return saved;
  }

  @Delete("setup/company/image")
  async removeCompanyImage() {
    const saved = await this.setup.saveCompany({ logoUrl: null });
    await this.consoleService.recordActivity({
      action: "company.image.removed",
      target: saved.name,
      detail: "logo",
    });
    return saved;
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

  @Sse("setup/settings/stream")
  settingsStream(): Observable<{ data: SettingsEvent }> {
    return this.setup.settingsStream().pipe(map((data) => ({ data })));
  }

  @Post("setup/settings")
  async saveSettings(@Body() body: Partial<HqOrgSettings>) {
    const saved = await this.setup.saveSettings(body);
    await this.consoleService.recordActivity({
      action: "settings.save",
      target: "organization",
      detail: Object.keys(body).join(", "),
    });
    return saved;
  }

  @Get("setup/data")
  async data() {
    const counts = await this.setup.counts();
    const tills = await this.consoleService.listTills();
    return {
      ...counts,
      tills: tills.length,
      catalog: this.catalog.list().length,
    };
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
