import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Sse,
} from "@nestjs/common";
import { map, Observable } from "rxjs";
import { CatalogService, type CatalogPatch } from "./catalog.service";

@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("items")
  items() {
    return this.catalog.list();
  }

  @Get("lookup")
  lookup(@Query("q") q = "") {
    return { item: this.catalog.lookup(q) };
  }

  @Patch("items/:id")
  update(@Param("id") id: string, @Body() body: CatalogPatch) {
    const item = this.catalog.update(id, body ?? {});
    if (!item) throw new NotFoundException("Item not found");
    return item;
  }

  @Get("stats")
  stats() {
    return this.catalog.stats();
  }

  @Get("taxonomy/usage")
  taxonomyUsage() {
    return this.catalog.taxonomyUsage();
  }

  @Post("taxonomy/rename")
  renameTaxonomy(
    @Body()
    body: { field?: "category" | "subcategory" | "unit"; from?: string; to?: string },
  ) {
    if (!body.field || !body.from?.trim() || !body.to?.trim()) {
      throw new NotFoundException("field, from, and to are required");
    }
    return this.catalog.renameTaxonomy(body.field, body.from, body.to);
  }

  @Sse("stream")
  stream(): Observable<{ data: unknown }> {
    return this.catalog.stream().pipe(map((data) => ({ data })));
  }
}
