// dto/assign-table.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AssignTableDto {
  @ApiProperty({ description: 'ID стола', required: true })
  @IsString()
  @IsNotEmpty()
  tableId: string;

  @ApiProperty({ description: 'Количество гостей', required: false })
  @IsString()
  @IsOptional()
  numberOfPeople?: string;
}

export class UnassignTableDto {
  @ApiProperty({ description: 'ID заказа', required: true })
  @IsString()
  @IsNotEmpty()
  orderId: string;
}