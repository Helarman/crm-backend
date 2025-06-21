import { ApiProperty } from '@nestjs/swagger';

export class UpdateAttentionFlagsDto {
  @ApiProperty({ description: 'Флаг дозаказа' })
  isReordered?: boolean;
  
  @ApiProperty({ description: 'Флаг наличия скидки' })
  hasDiscount?: boolean;
  
  @ApiProperty({ description: 'Флаг отмены скидки' })
  discountCanceled?: boolean;
  
  @ApiProperty({ description: 'Флаг пречека' })
  isPrecheck?: boolean;
  
  @ApiProperty({ description: 'Флаг возврата' })
  isRefund?: boolean;
}