import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ArrayMinSize } from 'class-validator';

export class CreateWorkshopDto {
  @ApiProperty({ description: 'Название цеха' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'ID сети (опционально)', required: false })
  @IsString()
  @IsOptional()
  networkId?: string;

  @ApiProperty({ 
    description: 'Массив ID ресторанов',
    type: [String],
    required: false 
  })
  @IsArray()
  @ArrayMinSize(0)
  @IsOptional()
  restaurantIds?: string[];
}