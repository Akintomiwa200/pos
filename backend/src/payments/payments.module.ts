import { Module } from "@nestjs/common";
import { ConsoleModule } from "../console/console.module";
import { SalesModule } from "../sales/sales.module";
import { PaymentEventsService } from "./payment-events.service";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [SalesModule, ConsoleModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentEventsService],
  exports: [PaymentsService, PaymentEventsService],
})
export class PaymentsModule {}
