import { Module } from "@nestjs/common";
import { SalesController } from "./sales.controller";
import { SalesService } from "./sales.service";
import { ConsoleModule } from "../console/console.module";
import { CatalogModule } from "../catalog/catalog.module";
import { ComboModule } from "../combos/combo.module";

@Module({
  imports: [ConsoleModule, CatalogModule, ComboModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
