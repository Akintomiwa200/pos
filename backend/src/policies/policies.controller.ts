import { BadRequestException, Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { PoliciesService } from "./policies.service";
import { isPolicyKind, type PolicyKind, type PolicyRecord } from "./policies.types";

function requireKind(value: string): PolicyKind {
  if (!isPolicyKind(value)) {
    throw new BadRequestException(`Unknown policies collection: ${value}`);
  }
  return value;
}

@Controller("policies")
export class PoliciesController {
  constructor(private readonly policies: PoliciesService) {}

  @Get()
  snapshot() {
    return this.policies.snapshot();
  }

  @Get(":kind")
  list(@Param("kind") kind: string) {
    return this.policies.list(requireKind(kind));
  }

  @Post(":kind")
  save(@Param("kind") kind: string, @Body() body: Partial<PolicyRecord>) {
    return this.policies.save(requireKind(kind), body ?? {});
  }

  @Delete(":kind/:id")
  remove(@Param("kind") kind: string, @Param("id") id: string) {
    return this.policies.remove(requireKind(kind), id);
  }

  @Delete(":kind")
  reset(@Param("kind") kind: string) {
    return this.policies.reset(requireKind(kind));
  }
}