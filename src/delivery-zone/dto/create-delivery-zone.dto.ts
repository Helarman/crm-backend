import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsString, IsOptional, IsNotEmpty, IsHexColor, Max, Min } from 'class-validator';

export class CreateDeliveryZoneDto {
  @ApiProperty({ example: 'Central District' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 200 })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({ example: 1000, required: false })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  minOrder?: number;

  @ApiProperty({ 
    example: 'POLYGON((30 10, 40 40, 20 40, 10 20, 30 10))',
    description: 'WKT (Well-Known Text) format'
  })
  @IsString()
  @IsNotEmpty()
  polygon: any;

  @ApiProperty({ example: 'clm1x9q8d0000pvow8q2q3k4z' })
  @IsString()
  @IsNotEmpty()
  restaurantId: string;

    @ApiProperty({ 
    example: '#3B82F6', 
    required: false,
    description: 'HEX color for the zone'
  })
  @IsString()
  @IsHexColor()
  @IsOptional()
  color?: string;

  @ApiProperty({ 
    example: 1, 
    required: false,
    description: 'Priority (higher number = higher priority)'
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  priority?: number;
  
}