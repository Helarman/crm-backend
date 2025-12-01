import { IsNumber, Max, Min } from "class-validator";

export class UpdatePersonalDiscountDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  discount: number;
}