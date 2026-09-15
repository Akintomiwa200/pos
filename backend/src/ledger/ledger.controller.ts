import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { LedgerService } from "./ledger.service";
import type {
  LedgerAccount,
  LedgerAdvance,
  LedgerFixedAsset,
  LedgerJournalEntry,
  LedgerPrepaid,
  StaffTarget,
  StoreTarget,
} from "./ledger.types";

@Controller("ledger")
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  @Get()
  snapshot() {
    return this.ledger.snapshot();
  }

  @Get("accounts")
  listAccounts() {
    return this.ledger.listAccounts();
  }

  @Post("accounts")
  saveAccount(@Body() body: Partial<LedgerAccount>) {
    return this.ledger.saveAccount(body ?? {});
  }

  @Delete("accounts/:id")
  deleteAccount(@Param("id") id: string) {
    return this.ledger.deleteAccount(id);
  }

  @Get("journal")
  listJournalEntries() {
    return this.ledger.listJournalEntries();
  }

  @Post("journal")
  saveJournalEntry(@Body() body: Partial<LedgerJournalEntry>) {
    return this.ledger.saveJournalEntry(body ?? {});
  }

  @Delete("journal/:id")
  deleteJournalEntry(@Param("id") id: string) {
    return this.ledger.deleteJournalEntry(id);
  }

  @Get("fixed-assets")
  listFixedAssets() {
    return this.ledger.listFixedAssets();
  }

  @Post("fixed-assets")
  saveFixedAsset(@Body() body: Partial<LedgerFixedAsset>) {
    return this.ledger.saveFixedAsset(body ?? {});
  }

  @Delete("fixed-assets/:id")
  deleteFixedAsset(@Param("id") id: string) {
    return this.ledger.deleteFixedAsset(id);
  }

  @Get("prepaids")
  listPrepaids() {
    return this.ledger.listPrepaids();
  }

  @Post("prepaids")
  savePrepaid(@Body() body: Partial<LedgerPrepaid>) {
    return this.ledger.savePrepaid(body ?? {});
  }

  @Delete("prepaids/:id")
  deletePrepaid(@Param("id") id: string) {
    return this.ledger.deletePrepaid(id);
  }

  @Get("advances")
  listAdvances() {
    return this.ledger.listAdvances();
  }

  @Post("advances")
  saveAdvance(@Body() body: Partial<LedgerAdvance>) {
    return this.ledger.saveAdvance(body ?? {});
  }

  @Delete("advances/:id")
  deleteAdvance(@Param("id") id: string) {
    return this.ledger.deleteAdvance(id);
  }

  @Get("store-targets")
  listStoreTargets() {
    return this.ledger.listStoreTargets();
  }

  @Post("store-targets")
  saveStoreTarget(@Body() body: Partial<StoreTarget>) {
    return this.ledger.saveStoreTarget(body ?? {});
  }

  @Delete("store-targets/:id")
  deleteStoreTarget(@Param("id") id: string) {
    return this.ledger.deleteStoreTarget(id);
  }

  @Get("staff-targets")
  listStaffTargets() {
    return this.ledger.listStaffTargets();
  }

  @Post("staff-targets")
  saveStaffTarget(@Body() body: Partial<StaffTarget>) {
    return this.ledger.saveStaffTarget(body ?? {});
  }

  @Delete("staff-targets/:id")
  deleteStaffTarget(@Param("id") id: string) {
    return this.ledger.deleteStaffTarget(id);
  }
}