import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
} from "@nestjs/common";
import { FloorService } from "./floor.service";
import { isBoardName } from "./floor.types";

@Controller("floor")
export class FloorController {
  constructor(private readonly floor: FloorService) {}

  @Get(":board")
  async list(@Param("board") board: string) {
    if (!isBoardName(board)) throw new NotFoundException("Unknown board");
    return this.floor.list(board);
  }

  @Put(":board")
  async replace(@Param("board") board: string, @Body() body: unknown) {
    if (!isBoardName(board)) throw new NotFoundException("Unknown board");
    return this.floor.replace(board, body);
  }
}
