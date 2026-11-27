import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { ConsoleController } from "./console.controller";
import { ConsoleService } from "./console.service";
import { SetupService } from "./setup.service";
import { ConsoleSessionGuard } from "./console-session.guard";

@Module({
  imports: [CatalogModule],
  controllers: [ConsoleController],
  providers: [ConsoleService, SetupService, ConsoleSessionGuard],
  exports: [ConsoleService, SetupService],
})
export class ConsoleModule {}
