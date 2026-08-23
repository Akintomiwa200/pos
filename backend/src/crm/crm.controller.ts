import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Sse,
} from "@nestjs/common";
import { map, Observable } from "rxjs";
import { CrmService } from "./crm.service";
import type {
  CrmActivity,
  CrmContact,
  CrmDeal,
  CrmEvent,
  CrmIssue,
  CrmProject,
  CrmTicket,
} from "./crm.types";

@Controller("crm")
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Sse("stream")
  stream(): Observable<{ data: CrmEvent }> {
    return this.crm.stream().pipe(map((data) => ({ data })));
  }

  @Get("summary")
  summary() {
    return this.crm.summary();
  }

  @Get("contacts")
  listContacts() {
    return this.crm.listContacts();
  }

  @Post("contacts")
  saveContact(@Body() body: Partial<CrmContact> & { name?: string }) {
    return this.crm.saveContact(body ?? {});
  }

  @Delete("contacts/:id")
  deleteContact(@Param("id") id: string) {
    return this.crm.deleteContact(id);
  }

  @Get("deals")
  listDeals() {
    return this.crm.listDeals();
  }

  @Post("deals")
  saveDeal(@Body() body: Partial<CrmDeal> & { title?: string }) {
    return this.crm.saveDeal(body ?? {});
  }

  @Delete("deals/:id")
  deleteDeal(@Param("id") id: string) {
    return this.crm.deleteDeal(id);
  }

  @Get("tickets")
  listTickets() {
    return this.crm.listTickets();
  }

  @Post("tickets")
  saveTicket(@Body() body: Partial<CrmTicket> & { subject?: string }) {
    return this.crm.saveTicket(body ?? {});
  }

  @Delete("tickets/:id")
  deleteTicket(@Param("id") id: string) {
    return this.crm.deleteTicket(id);
  }

  @Get("activities")
  listActivities() {
    return this.crm.listActivities();
  }

  @Post("activities")
  saveActivity(@Body() body: Partial<CrmActivity> & { title?: string }) {
    return this.crm.saveActivity(body ?? {});
  }

  @Delete("activities/:id")
  deleteActivity(@Param("id") id: string) {
    return this.crm.deleteActivity(id);
  }

  @Get("projects")
  listProjects() {
    return this.crm.listProjects();
  }

  @Post("projects")
  saveProject(@Body() body: Partial<CrmProject> & { name?: string }) {
    return this.crm.saveProject(body ?? {});
  }

  @Delete("projects/:id")
  deleteProject(@Param("id") id: string) {
    return this.crm.deleteProject(id);
  }

  @Get("issues")
  listIssues(@Query("projectId") projectId?: string) {
    return this.crm.listIssues(projectId);
  }

  @Get("issues/:id")
  getIssue(@Param("id") id: string) {
    return this.crm.getIssue(id);
  }

  @Post("issues")
  saveIssue(@Body() body: Partial<CrmIssue> & { title?: string; projectId?: string }) {
    return this.crm.saveIssue(body ?? {});
  }

  @Delete("issues/:id")
  deleteIssue(@Param("id") id: string) {
    return this.crm.deleteIssue(id);
  }

  @Get("issues/:id/comments")
  listComments(@Param("id") id: string) {
    return this.crm.listIssueComments(id);
  }

  @Post("issues/:id/comments")
  addComment(
    @Param("id") id: string,
    @Body() body: { body?: string; author?: string },
  ) {
    return this.crm.addIssueComment(id, body ?? {});
  }
}
