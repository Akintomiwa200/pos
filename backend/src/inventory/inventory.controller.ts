import { Controller, Get } from '@nestjs/common';

@Controller('inventory')
export class InventoryController {
  @Get()
  stock() {
    return [{ itemId: 'raspberry-tart', onHand: 24, reorderPoint: 8 }];
  }
}
