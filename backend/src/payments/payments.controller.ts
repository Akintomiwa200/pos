import { Body, Controller, Post } from '@nestjs/common';

@Controller('payments')
export class PaymentsController {
  @Post('charge')
  charge(
    @Body()
    body: {
      tender?: string;
      provider?: string;
      amountMinor?: number;
      parts?: number;
    },
  ) {
    return {
      status: 'in_progress',
      currency: 'NGN',
      tender: body.tender ?? 'cash',
      provider: body.provider ?? 'paystack',
      amountMinor: body.amountMinor ?? 500000,
      splitParts: body.parts ?? 1,
    };
  }
}
