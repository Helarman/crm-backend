import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class PartialRefundOrderItemDto {
  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  userId?: string;
}