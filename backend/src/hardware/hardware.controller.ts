import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
} from "@nestjs/common";
import { HardwareService, type LabelPrintJob } from "./hardware.service";

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

  @Get("label-printer")
  labelPrinterConfig() {
    return this.hardware.loadLabelPrinterConfig();
  }

  @Post("label-printer")
  saveLabelPrinterConfig(@Body() body: { name?: string | null }) {
    return this.hardware.saveLabelPrinterConfig(typeof body?.name === "string" ? body.name : null);
  }

  @Post("print-labels")
  async printLabels(@Body() body: { printerName?: string; labels?: LabelPrintJob[] }) {
    if (!body.printerName || !Array.isArray(body.labels) || body.labels.length === 0) {
      throw new BadRequestException("printerName and at least one label are required");
    }
    const clean = body.labels.map((label, index) => {
      const widthMm = Number(label.widthMm);
      const heightMm = Number(label.heightMm);
      if (!Number.isFinite(widthMm) || widthMm <= 0 || !Number.isFinite(heightMm) || heightMm <= 0) {
        throw new BadRequestException(`Label ${index + 1} has an invalid paper size`);
      }
      if (typeof label.imageBase64 !== "string" || label.imageBase64.length === 0) {
        throw new BadRequestException(`Label ${index + 1} has no image data`);
      }
      return {
        imageBase64: label.imageBase64,
        widthMm,
        heightMm,
        copies: typeof label.copies === "number" ? label.copies : 1,
      };
    });
    try {
      return await this.hardware.printLabels(body.printerName, clean);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Print failed";
      throw new BadRequestException(message);
    }
  }
}
