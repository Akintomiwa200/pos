import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
} from "@nestjs/common";
import { HardwareService } from "./hardware.service";

@Controller("hardware")
export class HardwareController {
  constructor(private readonly hardware: HardwareService) {}

  @Get("device")
  device() {
    return this.hardware.readDeviceHex();
  }

  @Get("printers")
  printers() {
    return this.hardware.listPrinters();
  }

  @Post("print")
  async print(@Body() body: { printerName?: string; content?: string }) {
    if (!body.printerName || !body.content) {
      throw new BadRequestException("printerName and content are required");
    }
    try {
      return await this.hardware.print(body.printerName, body.content);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Print failed";
      throw new BadRequestException(message);
    }
  }
}
