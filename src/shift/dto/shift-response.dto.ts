import { ApiProperty } from '@nestjs/swagger';
import { EnumShiftStatus } from '@prisma/client';

export class ShiftResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: EnumShiftStatus })
  status: EnumShiftStatus;

  @ApiProperty()
  startTime: Date;

  @ApiProperty({ nullable: true })
  endTime: Date | null;

  @ApiProperty()
  restaurant: {
    id: string;
    title: string;
  };

  @ApiProperty()
  users: Array<{
    userId: string;
    role?: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;

  @ApiProperty({ required: false })
  orders?: Array<{
    orderId: string;
    order: {
      id: string;
      total: number;
      status: string;
    };
  }>;
}