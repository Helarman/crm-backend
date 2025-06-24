import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateRestaurantDto {
  @IsOptional()
  title?: string;

  @IsOptional()
  address?: string;

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  latitude?: string;

  @IsOptional()
  longitude?: string;

   @IsOptional()
  networkId?: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  @IsString()
  legalInfo?: string;
  
}