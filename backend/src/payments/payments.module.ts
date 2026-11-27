import { Module } from "@nestjs/common";
import { ConsoleModule } from "../console/console.module";
import { SalesModule } from "../sales/sales.module";
import { PaymentsController } from "./payments.controller";

@Module({
  imports: [SalesModule, ConsoleModule],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
