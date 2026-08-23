import { Controller, Get } from '@nestjs/common';
import { CatalogService } from '../catalog/catalog.service';
import { ConsoleService } from '../console/console.service';
import { SetupService } from '../console/setup.service';

@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly console: ConsoleService,
    private readonly setup: SetupService,
  ) {}

  @Get()
  async list() {
    const snapshot = await this.setup.snapshot();
    const tills = this.console.listTills();
    return [
      {
        id: 'current',
        name: snapshot.company?.name || 'My Organisation',
        kind: 'organisation',
        tin: snapshot.company?.tin ?? null,
        branches: snapshot.branches.length,
        stores: snapshot.stores.length,
        catalogItems: this.catalog.list().length,
        tills: tills.map((till) => ({
          id: till.id,
          name: till.name,
          product: till.product,
          active: till.active !== false,
          online: till.online,
        })),
      },
    ];
  }
}
