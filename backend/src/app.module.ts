import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { CatalogModule } from './catalog/catalog.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { StaffModule } from './staff/staff.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { HardwareModule } from './hardware/hardware.module';
import { SalesModule } from './sales/sales.module';
import { ConsoleModule } from './console/console.module';

@Module({
  imports: [
    HealthModule,
    AuthModule,
    TenantsModule,
    CatalogModule,
    InventoryModule,
    OrdersModule,
    PaymentsModule,
    ReportsModule,
    StaffModule,
    IntegrationsModule,
    HardwareModule,
    SalesModule,
    ConsoleModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
