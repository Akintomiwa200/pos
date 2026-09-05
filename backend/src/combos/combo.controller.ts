import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Sse,
} from "@nestjs/common";
import { map, Observable } from "rxjs";
import { ComboService, type ComboView } from "./combo.service";

@Controller("combos")
export class ComboController {
  constructor(private readonly combos: ComboService) {}

  @Get()
  list(): ComboView[] {
    return this.combos.list();
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.combos.create(body ?? {});
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const combo = this.combos.update(id, body ?? {});
    if (!combo) throw new NotFoundException("Combo not found");
    return combo;
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    const combo = this.combos.remove(id);
    if (!combo) throw new NotFoundException("Combo not found");
    return { ok: true, id: combo.id };
  }

  @Sse("stream")
  stream(): Observable<{ data: unknown }> {
    return this.combos.stream().pipe(map((data) => ({ data })));
  }
}
