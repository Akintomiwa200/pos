import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { CustomersService } from "./customers.service";
import type {
  CustomerCredit,
  CustomerCreditRule,
  GiftCard,
  GiftCardBatch,
  LoyaltyCard,
  LoyaltyMember,
  LoyaltyProgram,
  CustomerGroup,
} from "./customers.types";

@Controller("customers")
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get("loyalty/program")
  loyaltyProgram() {
    return this.customers.getLoyaltyProgram();
  }

  @Post("loyalty/program")
  saveLoyaltyProgram(@Body() body: Partial<LoyaltyProgram>) {
    return this.customers.saveLoyaltyProgram(body);
  }

  @Get("credits")
  listCredits() {
    return this.customers.listCredits();
  }

  @Post("credits")
  saveCredit(@Body() body: Partial<CustomerCredit> & { id?: string }) {
    return this.customers.saveCredit(body);
  }

  @Delete("credits/:id")
  deleteCredit(@Param("id") id: string) {
    return this.customers.deleteCredit(id);
  }

  @Get("credit-rules")
  listCreditRules() {
    return this.customers.listCreditRules();
  }

  @Post("credit-rules")
  saveCreditRule(@Body() body: Partial<CustomerCreditRule> & { id?: string }) {
    return this.customers.saveCreditRule(body);
  }

  @Delete("credit-rules/:id")
  deleteCreditRule(@Param("id") id: string) {
    return this.customers.deleteCreditRule(id);
  }

  @Get("loyalty/members")
  listLoyaltyMembers() {
    return this.customers.listLoyaltyMembers();
  }

  @Post("loyalty/members")
  saveLoyaltyMember(@Body() body: Partial<LoyaltyMember> & { id?: string }) {
    return this.customers.saveLoyaltyMember(body);
  }

  @Delete("loyalty/members/:id")
  deleteLoyaltyMember(@Param("id") id: string) {
    return this.customers.deleteLoyaltyMember(id);
  }

  @Get("loyalty/cards")
  listLoyaltyCards() {
    return this.customers.listLoyaltyCards();
  }

  @Post("loyalty/cards")
  saveLoyaltyCard(@Body() body: Partial<LoyaltyCard> & { id?: string }) {
    return this.customers.saveLoyaltyCard(body);
  }

  @Delete("loyalty/cards/:id")
  deleteLoyaltyCard(@Param("id") id: string) {
    return this.customers.deleteLoyaltyCard(id);
  }

  @Get("gift-cards")
  listGiftCards() {
    return this.customers.listGiftCards();
  }

  @Post("gift-cards")
  saveGiftCard(@Body() body: Partial<GiftCard> & { id?: string }) {
    return this.customers.saveGiftCard(body);
  }

  @Delete("gift-cards/:id")
  deleteGiftCard(@Param("id") id: string) {
    return this.customers.deleteGiftCard(id);
  }

  @Get("gift-batches")
  listGiftBatches() {
    return this.customers.listGiftBatches();
  }

  @Post("gift-batches")
  saveGiftBatch(@Body() body: Partial<GiftCardBatch> & { id?: string }) {
    return this.customers.saveGiftBatch(body);
  }

  @Delete("gift-batches/:id")
  deleteGiftBatch(@Param("id") id: string) {
    return this.customers.deleteGiftBatch(id);
  }

  @Get("groups")
  listCustomerGroups() {
    return this.customers.listCustomerGroups();
  }

  @Post("groups")
  saveCustomerGroup(@Body() body: Partial<CustomerGroup> & { id?: string }) {
    return this.customers.saveCustomerGroup(body);
  }

  @Delete("groups/:id")
  deleteCustomerGroup(@Param("id") id: string) {
    return this.customers.deleteCustomerGroup(id);
  }
}
