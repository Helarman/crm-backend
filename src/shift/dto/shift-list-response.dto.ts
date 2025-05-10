import { ApiProperty } from '@nestjs/swagger';
import { ShiftResponseDto } from './shift-response.dto';

export class ShiftListResponseDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty({ type: [ShiftResponseDto] })
  data: ShiftResponseDto[];
}