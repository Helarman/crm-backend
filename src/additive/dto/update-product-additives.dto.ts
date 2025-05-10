import { ApiProperty } from '@nestjs/swagger';

export class UpdateProductAdditivesDto {
  @ApiProperty({
    description: 'Массив ID добавок',
    example: ['additive1', 'additive2'],
    type: [String],
  })
  additiveIds: string[];
}