import { ApiProperty } from '@nestjs/swagger';
import { TenantType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateTenantDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ enum: TenantType, required: false })
  @IsEnum(TenantType)
  @IsOptional()
  type?: TenantType;

  @ApiProperty({ required: false })
  @IsUrl()
  @IsOptional()
  domain?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  subdomain?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  secondaryColor?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  accentColor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  settings?: any;

  network?: any

  networkId?: string;
}