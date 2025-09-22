import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdateOrderItemQuantityDto {
  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  userId?: string;
}