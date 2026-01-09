import { ApiProperty } from '@nestjs/swagger';
import { DiscountType, DiscountTargetType } from '@prisma/client';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsBoolean,
  IsEnum,
  IsDate
} from 'class-validator';
import { Type } from 'class-transformer';

// DTO для создания скидки
export class CreateDiscountDto {
  @ApiProperty({ description: 'Название скидки' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Описание скидки', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: DiscountType, description: 'Тип скидки' })
  @IsEnum(DiscountType)
  type: DiscountType;

  @ApiProperty({ description: 'Значение скидки' })
  @IsNumber()
  value: number;

  @ApiProperty({
    enum: DiscountTargetType,
    description: 'Тип цели скидки',
    default: DiscountTargetType.ALL
  })
  @IsEnum(DiscountTargetType)
  targetType: DiscountTargetType = DiscountTargetType.ALL;

  @ApiProperty({ description: 'Минимальная сумма заказа', required: false })
  @IsNumber()
  @IsOptional()
  minOrderAmount?: number;

  @ApiProperty({ description: 'Максимальная сумма заказа', required: false })
  @IsNumber()
  @IsOptional()
  maxOrderAmount?: number;

  @ApiProperty({ description: 'Дата начала действия', required: false })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ description: 'Дата окончания действия', required: false })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({
    description: 'Время начала действия (0-23)',
    required: false,
    minimum: 0,
    maximum: 23
  })
  @IsNumber()
  @IsOptional()
  startTime?: number;

  @ApiProperty({
    description: 'Время окончания действия (0-23)',
    required: false,
    minimum: 0,
    maximum: 23
  })
  @IsNumber()
  @IsOptional()
  endTime?: number;

  @ApiProperty({ description: 'Активна ли скидка', default: true })
  @IsBoolean()
  isActive: boolean = true;

  @ApiProperty({ description: 'Промокод', required: false })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ description: 'Максимальное количество использований', required: false })
  @IsNumber()
  @IsOptional()
  maxUses?: number;

  @ApiProperty({ description: 'ID сети', required: false })
  @IsString()
  @IsOptional()
  networkId?: string;

  @ApiProperty({
    description: 'ID ресторанов, к которым применяется скидка',
    type: [String],
    required: false
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  restaurantIds?: string[];

  @ApiProperty({
    description: 'ID продуктов, к которым применяется скидка',
    type: [String],
    required: false
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productIds?: string[];
}

// DTO для обновления скидки
export class UpdateDiscountDto extends CreateDiscountDto {
  @ApiProperty({
    description: 'ID сети',
    required: false
  })
  @IsString()
  @IsOptional()
  networkId?: string;

  @ApiProperty({
    description: 'ID ресторанов, к которым применяется скидка',
    type: [String],
    required: false
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  restaurantIds?: string[];

  @ApiProperty({
    description: 'ID продуктов, к которым применяется скидка',
    type: [String],
    required: false
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productIds?: string[];
}

// DTO для ответа со скидкой
export class DiscountResponseDto {
  @ApiProperty({ description: 'ID скидки' })
  id: string;

  @ApiProperty({ description: 'Название скидки' })
  title: string;

  @ApiProperty({ description: 'Описание скидки', required: false })
  description?: string;

  @ApiProperty({ enum: DiscountType, description: 'Тип скидки' })
  type: DiscountType;

  @ApiProperty({ description: 'Значение скидки' })
  value: number;

  @ApiProperty({ enum: DiscountTargetType, description: 'Тип цели скидки' })
  targetType: DiscountTargetType;

  @ApiProperty({ description: 'Минимальная сумма заказа', required: false })
  minOrderAmount?: number;

  @ApiProperty({ description: 'Максимальная сумма заказа', required: false })
  maxOrderAmount?: number;

  @ApiProperty({ description: 'Дата начала действия', required: false })
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({ description: 'Дата окончания действия', required: false })
  @Type(() => Date)
  endDate?: Date;

  @ApiProperty({ description: 'Время начала действия (0-23)', required: false })
  startTime?: number;

  @ApiProperty({ description: 'Время окончания действия (0-23)', required: false })
  endTime?: number;

  @ApiProperty({ description: 'Активна ли скидка' })
  isActive: boolean;

  @ApiProperty({ description: 'Промокод', required: false })
  code?: string;

  @ApiProperty({ description: 'Максимальное количество использований', required: false })
  maxUses?: number;

  @ApiProperty({ description: 'Текущее количество использований' })
  currentUses: number;

  @ApiProperty({ description: 'Дата создания' })
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления' })
  @Type(() => Date)
  updatedAt: Date;

  @ApiProperty({
    description: 'Информация о сети',
    required: false
  })
  network?: {
    id: string;
    name: string;
  };

  @ApiProperty({
    description: 'Рестораны, к которым применяется скидка',
    type: [Object],
    required: false
  })
  restaurants?: Array<{
    restaurant: {
      id: string;
      title: string;
      address: string;
    };
  }>;

  @ApiProperty({
    description: 'Продукты, к которым применяется скидка',
    type: [Object],
    required: false
  })
  products?: Array<{
    product: {
      id: string;
      title: string;
      price: number;
    };
  }>;

  constructor(partial: Partial<DiscountResponseDto>) {
    Object.assign(this, partial);
  }
}

// DTO для применения скидки
export class ApplyDiscountDto {
  @ApiProperty({ description: 'ID заказа' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'ID скидки' })
  @IsString()
  discountId: string;

  @ApiProperty({ description: 'ID клиента', required: false })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ description: 'Промокод', required: false })
  @IsString()
  @IsOptional()
  promoCode?: string;
}

// DTO для генерации промокода
export class GeneratePromoCodeDto {
  @ApiProperty({ description: 'ID скидки' })
  @IsString()
  discountId: string;

  @ApiProperty({ description: 'ID клиента' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'Количество промокодов', default: 1, required: false })
  @IsNumber()
  @IsOptional()
  count?: number = 1;

  @ApiProperty({ description: 'Срок действия в днях', required: false })
  @IsNumber()
  @IsOptional()
  expiresInDays?: number;
}

// DTO для запроса скидок по продуктам
export class ProductDiscountsDto {
  @ApiProperty({
    description: 'Массив ID продуктов',
    type: [String],
    example: ['d9f80740-38f0-11e8-b467-0ed5f89f718b', 'd9f80920-38f0-11e8-b467-0ed5f89f718b'],
  })
  @IsArray()
  productIds: string[];

  @ApiProperty({
    description: 'ID ресторана для проверки доступности скидок',
    required: false
  })
  @IsString()
  @IsOptional()
  restaurantId?: string;

  @ApiProperty({
    description: 'ID сети для проверки доступности скидок',
    required: false
  })
  @IsString()
  @IsOptional()
  networkId?: string;
}

// DTO для поиска скидок
export class FindDiscountsDto {
  @ApiProperty({ description: 'ID сети', required: false })
  @IsString()
  @IsOptional()
  networkId?: string;

  @ApiProperty({ description: 'ID ресторана', required: false })
  @IsString()
  @IsOptional()
  restaurantId?: string;

  @ApiProperty({ description: 'ID продукта', required: false })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiProperty({ enum: DiscountType, required: false })
  @IsEnum(DiscountType)
  @IsOptional()
  type?: DiscountType;

  @ApiProperty({ enum: DiscountTargetType, required: false })
  @IsEnum(DiscountTargetType)
  @IsOptional()
  targetType?: DiscountTargetType;

  @ApiProperty({ description: 'Минимальное значение скидки', required: false })
  @IsNumber()
  @IsOptional()
  minValue?: number;

  @ApiProperty({ description: 'Максимальное значение скидки', required: false })
  @IsNumber()
  @IsOptional()
  maxValue?: number;

  @ApiProperty({ description: 'Только активные скидки', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @ApiProperty({ description: 'Содержит промокод', required: false })
  @IsBoolean()
  @IsOptional()
  hasCode?: boolean;

  @ApiProperty({ description: 'Дата начала действия', required: false })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ description: 'Дата окончания действия', required: false })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ description: 'Сортировка', required: false })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiProperty({ description: 'Порядок сортировки', enum: ['asc', 'desc'], required: false })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiProperty({ description: 'Страница', default: 1 })
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ description: 'Количество элементов на странице', default: 20 })
  @IsNumber()
  @IsOptional()
  limit?: number = 20;
}

// DTO для проверки скидки
export class ValidateDiscountDto {
  @ApiProperty({ description: 'ID скидки или промокод' })
  @IsString()
  discountIdOrCode: string;

  @ApiProperty({ description: 'ID ресторана' })
  @IsString()
  restaurantId: string;

  @ApiProperty({ description: 'Текущая сумма заказа' })
  @IsNumber()
  currentAmount: number;

  @ApiProperty({
    description: 'Список продуктов в заказе',
    type: [Object],
    required: false
  })
  @IsArray()
  @IsOptional()
  orderItems?: Array<{
    productId: string;
    price: number;
    quantity: number;
    isRefund: boolean;
  }>;
}

// DTO для ответа с пагинацией
export class PaginatedDiscountsResponseDto {
  @ApiProperty({ description: 'Список скидок', type: [DiscountResponseDto] })
  data: DiscountResponseDto[];

  @ApiProperty({ description: 'Текущая страница' })
  page: number;

  @ApiProperty({ description: 'Количество элементов на странице' })
  limit: number;

  @ApiProperty({ description: 'Общее количество элементов' })
  total: number;

  @ApiProperty({ description: 'Общее количество страниц' })
  totalPages: number;

  @ApiProperty({ description: 'Есть ли следующая страница' })
  hasNext: boolean;

  @ApiProperty({ description: 'Есть ли предыдущая страница' })
  hasPrev: boolean;
}

// DTO для отмены применения скидки
export class RemoveDiscountDto {
  @ApiProperty({ description: 'ID заказа' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'ID применения скидки', required: false })
  @IsString()
  @IsOptional()
  discountApplicationId?: string;

  @ApiProperty({ description: 'Причина отмены', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}