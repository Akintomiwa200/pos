import { Module } from "@nestjs/common";
import { SalesModule } from "../sales/sales.module";
import { PaymentsController } from "./payments.controller";

@Module({
  imports: [SalesModule],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
