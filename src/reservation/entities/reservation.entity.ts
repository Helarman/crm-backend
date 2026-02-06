import { ApiProperty } from '@nestjs/swagger';

export enum ReservationStatus {
  CONFIRMED = 'CONFIRMED',      // Подтверждено
  PENDING = 'PENDING',          // Ожидает подтверждения
  ARRIVED = 'ARRIVED',          // Клиент пришел
  CANCELLED = 'CANCELLED',      // Отменено
  NO_SHOW = 'NO_SHOW',          // Клиент не явился
  COMPLETED = 'COMPLETED',      // Завершено
}

export class Reservation {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tableId: string;

  @ApiProperty()
  customerId?: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  customerName: string;

  @ApiProperty()
  reservationTime: Date;

  @ApiProperty({ enum: ReservationStatus })
  status: ReservationStatus;

  @ApiProperty()
  numberOfPeople: number;

  @ApiProperty({ required: false })
  comment?: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty()
  source: string;

  @ApiProperty({ required: false })
  arrivalTime?: Date;

  @ApiProperty({ required: false })
  cancellationTime?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Relations
  table?: any;
  customer?: any;
  restaurant?: any;
  hall?: any;
}