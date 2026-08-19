import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  Sse,
} from "@nestjs/common";
import { map, Observable } from "rxjs";
import { CatalogService } from "./catalog.service";

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
  update(
    @Param("id") id: string,
    @Body() body: { priceMinor?: number; onHand?: number },
  ) {
    const item = this.catalog.update(id, body ?? {});
    if (!item) throw new NotFoundException("Item not found");
    return item;
  }

  @Sse("stream")
  stream(): Observable<{ data: unknown }> {
    return this.catalog.stream().pipe(map((data) => ({ data })));
  }
}
