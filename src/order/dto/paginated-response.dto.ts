import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseMeta {
  @ApiProperty({ description: 'Общее количество записей' })
  total: number;

  @ApiProperty({ description: 'Текущая страница' })
  page: number;

  @ApiProperty({ description: 'Количество записей на странице' })
  limit: number;

  @ApiProperty({ description: 'Общее количество страниц' })
  totalPages: number;
}

export class PaginatedResponse<T> {
  @ApiProperty({ type: PaginatedResponseMeta })
  meta: PaginatedResponseMeta;

  @ApiProperty({ type: Array })
  data: T[];
}