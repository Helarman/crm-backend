import { IsEnum, IsString, IsInt, IsOptional } from 'class-validator';

import { EnumPaymentMethod, EnumPaymentStatus } from '@prisma/client';


export class CreatePaymentDto {

  @IsString()

  orderId: string;


  @IsInt()

  amount: number;


  @IsEnum(EnumPaymentMethod)

  method: EnumPaymentMethod;


  @IsOptional()

  @IsString()

  externalId?: string;

}
