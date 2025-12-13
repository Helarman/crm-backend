import { ApiProperty } from '@nestjs/swagger';
import { 
  IsEnum, 
  IsOptional, 
  IsString, 
  IsDateString, 
  IsNumber, 
  IsArray,
  IsUUID,
  Min,
  Max,
  ValidateIf,
  IsBoolean
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { NetworkTransactionType } from '@prisma/client';

export enum TransactionSortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  AMOUNT = 'amount',
  TYPE = 'type',
  BALANCE_AFTER = 'balanceAfter'
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export class GetNetworkTransactionsDto {
  @ApiProperty({
    description: 'Тип транзакции (можно указать несколько через запятую)',
    enum: NetworkTransactionType,
    example: 'DEPOSIT,WITHDRAWAL',
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    return value.split(',').map(item => item.trim()) as NetworkTransactionType[];
  })
  @IsArray()
  @IsEnum(NetworkTransactionType, { each: true })
  types?: NetworkTransactionType[];

  @ApiProperty({
    description: 'Минимальная сумма транзакции',
    example: 100,
    required: false,
    minimum: 0
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minAmount?: number;

  @ApiProperty({
    description: 'Максимальная сумма транзакции',
    example: 5000,
    required: false,
    minimum: 0
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @ValidateIf(o => o.minAmount !== undefined)
  maxAmount?: number;

  @ApiProperty({
    description: 'Минимальный баланс после операции',
    example: 1000,
    required: false,
    minimum: 0
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minBalanceAfter?: number;

  @ApiProperty({
    description: 'Максимальный баланс после операции',
    example: 10000,
    required: false,
    minimum: 0
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @ValidateIf(o => o.minBalanceAfter !== undefined)
  maxBalanceAfter?: number;

  @ApiProperty({
    description: 'Дата начала периода (ISO строка или YYYY-MM-DD)',
    example: '2024-01-01',
    required: false
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'Дата окончания периода (ISO строка или YYYY-MM-DD)',
    example: '2024-01-31',
    required: false
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'ID пользователя, создавшего транзакцию',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false
  })
  @IsOptional()
  @IsUUID()
  createdById?: string;

  @ApiProperty({
    description: 'Тип связанной операции',
    example: 'INVOICE_PAYMENT',
    required: false
  })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiProperty({
    description: 'ID связанной операции',
    example: '660e8400-e29b-41d4-a716-446655440001',
    required: false
  })
  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @ApiProperty({
    description: 'Поиск по описанию (регистронезависимый)',
    example: 'пополнение баланса',
    required: false
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Поле для сортировки',
    enum: TransactionSortField,
    default: TransactionSortField.CREATED_AT,
    required: false
  })
  @IsOptional()
  @IsEnum(TransactionSortField)
  sortBy?: TransactionSortField = TransactionSortField.CREATED_AT;

  @ApiProperty({
    description: 'Порядок сортировки',
    enum: SortOrder,
    default: SortOrder.DESC,
    required: false
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiProperty({
    description: 'Лимит записей (1-100)',
    example: 10,
    required: false,
    minimum: 1,
    maximum: 100,
    default: 20
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: 'Страница (для пагинации)',
    example: 1,
    required: false,
    minimum: 1,
    default: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Включить агрегированные данные',
    example: true,
    required: false,
    default: false
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === '1')
  includeSummary?: boolean = false;

  @ApiProperty({
    description: 'Включить информацию о создателе',
    example: true,
    required: false,
    default: true
  })
  @IsOptional()
  @Transform(({ value }) => value === 'false' || value === false || value === '0' ? false : true)
  includeCreator?: boolean = true;

  @ApiProperty({
    description: 'Группировать по дню/месяцу',
    example: 'day',
    enum: ['day', 'month', 'year'],
    required: false
  })
  @IsOptional()
  @IsEnum(['day', 'month', 'year'])
  groupBy?: 'day' | 'month' | 'year';

  @ApiProperty({
    description: 'Включить только последние транзакции за N дней',
    example: 7,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  lastNDays?: number;
}

// DTO для ответа с группировкой по датам
export class GroupedTransactionsDto {
  @ApiProperty({
    description: 'Дата группировки',
    example: '2024-01-15'
  })
  date: string;

  @ApiProperty({
    description: 'Общая сумма депозитов за период',
    example: 5000
  })
  totalDeposits: number;

  @ApiProperty({
    description: 'Общая сумма списаний за период',
    example: 2500
  })
  totalWithdrawals: number;

  @ApiProperty({
    description: 'Чистое изменение баланса',
    example: 2500
  })
  netChange: number;

  @ApiProperty({
    description: 'Количество транзакций',
    example: 5
  })
  count: number;

  @ApiProperty({
    description: 'Список транзакций за этот период',
    type: [Object]
  })
  transactions?: any[];
}