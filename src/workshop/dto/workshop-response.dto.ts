import { ApiProperty } from '@nestjs/swagger';

export class WorkshopResponseDto {
  @ApiProperty({ example: 'cln8z9p3a000008l49w9z5q1e', description: 'ID цеха' })
  id: string;

  @ApiProperty({ example: 'Пиццерия', description: 'Название цеха' })
  name: string;

  @ApiProperty({ example: '2023-10-01T12:00:00.000Z', description: 'Дата создания' })
  createdAt: Date;

  @ApiProperty({ example: '2023-10-01T12:00:00.000Z', description: 'Дата обновления' })
  updatedAt: Date;
}