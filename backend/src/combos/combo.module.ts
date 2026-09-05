import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { ComboController } from "./combo.controller";
import { ComboService } from "./combo.service";

@Module({
  imports: [CatalogModule],
  controllers: [ComboController],
  providers: [ComboService],
  exports: [ComboService],
})
export class ComboModule {}
