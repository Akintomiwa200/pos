import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { DirectoryModule } from './directory/directory.module';
import { CatalogModule } from './catalog/catalog.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrdersModule } from './orders/orders.module';
import { ExpensesModule } from './expenses/expenses.module';
import { FloorModule } from './floor/floor.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { StaffModule } from './staff/staff.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { HardwareModule } from './hardware/hardware.module';
import { SalesModule } from './sales/sales.module';
import { ConsoleModule } from './console/console.module';
import { CustomersModule } from './customers/customers.module';
import { ChatModule } from './chat/chat.module';
import { EmailModule } from './email/email.module';
import { CrmModule } from './crm/crm.module';

@Module({
  imports: [
    DbModule,
    EmailModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    DirectoryModule,
    CatalogModule,
    InventoryModule,
    OrdersModule,
    ExpensesModule,
    FloorModule,
    PaymentsModule,
    ReportsModule,
    StaffModule,
    IntegrationsModule,
    HardwareModule,
    SalesModule,
    ConsoleModule,
    CustomersModule,
    ChatModule,
    CrmModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
