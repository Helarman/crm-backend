import { ApiProperty } from '@nestjs/swagger';
import { EnumSurchargeType as SurchargeType, EnumOrderType as OrderType } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateSurchargeDto {
    @ApiProperty({ example: 'Доставка', description: 'Название надбавки' })
    title: string;

    @ApiProperty({ example: 'Надбавка за доставку', description: 'Описание', required: false })
    description?: string;

    @ApiProperty({ enum: SurchargeType, example: SurchargeType.FIXED, description: 'Тип надбавки' })
    type: SurchargeType;

    @ApiProperty({ example: 100, description: 'Сумма или процент' })
    @Transform(({ value }) => parseFloat(value))
    amount: number;

    @ApiProperty({ enum: OrderType, isArray: true, example: [OrderType.DELIVERY], description: 'Типы заказов' })
    orderTypes: OrderType[];

    @ApiProperty({ example: true, description: 'Активна ли надбавка', required: false })
    isActive?: boolean;

    @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Дата начала действия', required: false })
    startDate?: Date;

    @ApiProperty({ example: '2023-12-31T23:59:59Z', description: 'Дата окончания действия', required: false })
    endDate?: Date;

    @ApiProperty({ example: ['restaurantId1', 'restaurantId2'], description: 'ID ресторанов', required: false })
    restaurantIds?: string[];
}