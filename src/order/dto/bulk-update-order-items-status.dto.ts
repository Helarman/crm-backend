import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { EnumOrderItemStatus } from '@prisma/client';

export class BulkUpdateOrderItemsStatusDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  itemIds: string[];

  @ApiProperty({ enum: EnumOrderItemStatus })
  @IsEnum(EnumOrderItemStatus)
  status: EnumOrderItemStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userId?: string;
}