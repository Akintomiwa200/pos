import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { ConsoleModule } from "../console/console.module";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";

@Module({
  imports: [CatalogModule, ConsoleModule],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
