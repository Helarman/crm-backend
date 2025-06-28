import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class ApplyDiscountDto {
  @ApiProperty({ description: 'ID скидки' })
  @IsString()
  discountId: string;
}

export class DiscountApplicationResponse {
  @ApiProperty({ description: 'Сумма скидки' })
  amount: number;

  @ApiProperty({ description: 'Описание применения скидки' })
  description: string;

  @ApiProperty({ description: 'Новая сумма заказа' })
  newTotal: number;
}