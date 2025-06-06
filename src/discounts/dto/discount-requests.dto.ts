import { ApiProperty } from '@nestjs/swagger';

export class ProductIdsDto {
  @ApiProperty({ type: [String], description: 'Array of product IDs' })
  productIds: string[];
}

export class CategoryIdsDto {
  @ApiProperty({ type: [String], description: 'Array of category IDs' })
  categoryIds: string[];
}

export class GenerateCodeDto {
  @ApiProperty({ description: 'Customer ID' })
  customerId: string;
}