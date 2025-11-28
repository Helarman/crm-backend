import { PartialType } from '@nestjs/swagger';
import { CreatePaymentIntegrationDto } from './create-payment-integration.dto';

export class UpdatePaymentIntegrationDto extends PartialType(CreatePaymentIntegrationDto) {}