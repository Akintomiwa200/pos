import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Sse,
} from "@nestjs/common";
import { map } from "rxjs";
import { DirectoryService, type DirectoryRowsEvent } from "./directory.service";
import { isDirectoryName, type DirectoryName, type DirectoryRecord } from "./directory.types";

@Controller("directory")
export class DirectoryController {
  constructor(private readonly directory: DirectoryService) {}

  @Sse("stream")
  stream() {
    return this.directory.stream().pipe(map((data) => ({ data })));
  }

  @Get(":name")
  list(@Param("name") name: string) {
    return this.directory.list(this.assert(name));
  }

  @Post(":name")
  save(@Param("name") name: string, @Body() body: Partial<DirectoryRecord>) {
    return this.directory.save(this.assert(name), body ?? {});
  }

  @Delete(":name/:id")
  delete(@Param("name") name: string, @Param("id") id: string) {
    return this.directory.delete(this.assert(name), id);
  }

  private assert(name: string): DirectoryName {
    if (!isDirectoryName(name)) throw new NotFoundException("Unknown directory");
    return name;
  }
}
