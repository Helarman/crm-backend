import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddProductDto {
  @ApiProperty({
    description: 'ID продукта для добавления в ресторан',
    example: 'clnjak7xj000008jk5q1q3b2m',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;
}