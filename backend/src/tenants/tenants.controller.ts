import { Controller, Get } from '@nestjs/common';

@Controller('tenants')
export class TenantsController {
  @Get()
  list() {
    return [
      { id: 't-super', name: 'Shoprite Ikeja', kind: 'supermarket' },
      { id: 't-hotel', name: 'Eko Hotel', kind: 'hotel' },
      { id: 't-rest', name: 'The Place VI', kind: 'restaurant' },
      { id: 't-dk', name: 'Yaba Dark Kitchen', kind: 'dark_kitchen' },
    ];
  }
}
