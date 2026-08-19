import { Controller, Get } from '@nestjs/common';

@Controller('orders')
export class OrdersController {
  @Get()
  list() {
    return [{ id: 'ord-1', status: 'open', totalMinor: 948 }];
  }
}
