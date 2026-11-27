import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { ComboModule } from "../combos/combo.module";
import { ConsoleModule } from "../console/console.module";
import { CrmModule } from "../crm/crm.module";
import { CustomersModule } from "../customers/customers.module";
import { DirectoryModule } from "../directory/directory.module";
import { ExpensesModule } from "../expenses/expenses.module";
import { InventoryModule } from "../inventory/inventory.module";
import { LedgerModule } from "../ledger/ledger.module";
import { OrdersModule } from "../orders/orders.module";
import { ProductionModule } from "../production/production.module";
import { SalesModule } from "../sales/sales.module";
import { StaffModule } from "../staff/staff.module";
import { DataTransferController } from "./data-transfer.controller";
import { DataTransferService } from "./data-transfer.service";

@Module({
  imports: [
    CatalogModule,
    ComboModule,
    ConsoleModule,
    CrmModule,
    CustomersModule,
    DirectoryModule,
    ExpensesModule,
    InventoryModule,
    LedgerModule,
    OrdersModule,
    ProductionModule,
    SalesModule,
    StaffModule,
  ],
  controllers: [DataTransferController],
  providers: [DataTransferService],
  exports: [DataTransferService],
})
export class DataTransferModule {}
