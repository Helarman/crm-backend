import { ApiProperty } from '@nestjs/swagger';

export class UpdateBonusPointsDto {
  @ApiProperty({
    description: 'Новое значение бонусных баллов',
    example: 100,
  })
  bonusPoints: number;
}