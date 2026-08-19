import { Controller, Get } from '@nestjs/common';

@Controller('reports')
export class ReportsController {
  @Get('x')
  xReport() {
    return { kind: 'X', netMinor: 948, cashExpectedMinor: 948 };
  }

  @Get('z')
  zReport() {
    return { kind: 'Z', netMinor: 948, closed: true };
  }
}
