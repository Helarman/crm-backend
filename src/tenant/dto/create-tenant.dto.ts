import { ApiProperty } from '@nestjs/swagger';
import { TenantType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: TenantType, default: TenantType.API })
  @IsEnum(TenantType)
  type: TenantType;

  @ApiProperty({ required: false })
  @IsOptional()
  domain?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  subdomain?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiProperty({ default: '#4f46e5' })
  @IsString()
  primaryColor: string;

  
  @ApiProperty({ default: '#4f46e5' })
  @IsString()
  secondaryColor: string;

  
  @ApiProperty({ default: '#4f46e5' })
  @IsString()
  accentColor: string;

  networkId: string
  
}