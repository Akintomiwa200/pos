import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { ConsoleModule } from '../console/console.module';
import { TenantsController } from './tenants.controller';

@Module({
  imports: [CatalogModule, ConsoleModule],
  controllers: [TenantsController],
})
export class TenantsModule {}
