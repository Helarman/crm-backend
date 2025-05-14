// dto/update-payment.dto.ts

import { IsEnum, IsString, IsInt, IsOptional } from 'class-validator';
import { EnumPaymentStatus } from '@prisma/client';

export class UpdatePaymentDto {
  @IsOptional()
  @IsEnum(EnumPaymentStatus)
  status?: EnumPaymentStatus;

  @IsOptional()
  @IsInt()
  amount?: number;

  @IsOptional()
  @IsString()
  externalId?: string;
}
