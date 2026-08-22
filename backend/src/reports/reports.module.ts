import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { ConsoleModule } from "../console/console.module";
import { OrdersModule } from "../orders/orders.module";
import { SalesModule } from "../sales/sales.module";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  imports: [SalesModule, CatalogModule, OrdersModule, ConsoleModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
