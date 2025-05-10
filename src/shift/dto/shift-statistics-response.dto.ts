import { ApiProperty } from '@nestjs/swagger';

export class ShiftStatisticsResponseDto {
  @ApiProperty()
  shiftId: string;

  @ApiProperty()
  totalUsers: number;

  @ApiProperty()
  totalOrders: number;

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  orderStats: Array<{
    status: string;
    count: number;
  }>;
}