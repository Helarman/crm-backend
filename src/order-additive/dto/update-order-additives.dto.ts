import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class UpdateOrderAdditivesDto {
  @ApiProperty({ 
    description: 'ID модификаторов заказов для привязки',
    type: [String] 
  })
  @IsArray()
  @IsString({ each: true })
  orderAdditiveIds: string[];
}