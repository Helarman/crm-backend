import { ApiProperty } from '@nestjs/swagger';

export class IncrementBonusPointsDto {
  @ApiProperty({
    description: 'Количество баллов для добавления (может быть отрицательным)',
    example: 10,
  })
  points: number;
}