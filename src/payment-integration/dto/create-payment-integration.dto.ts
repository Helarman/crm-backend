import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum PaymentProviderType {
  YOOKASSA = 'YOOKASSA',
  CLOUDPAYMENTS = 'CLOUDPAYMENTS',
  SBERBANK = 'SBERBANK',
  ALFABANK = 'ALFABANK',
  SBP = 'SBP',
  TINKOFF = 'TINKOFF'
}

export class CreatePaymentIntegrationDto {
  @ApiProperty({ description: 'Название интеграции' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ enum: PaymentProviderType, description: 'Тип платежной системы' })
  @IsNotEmpty()
  @IsEnum(PaymentProviderType)
  provider: PaymentProviderType;

  @ApiPropertyOptional({ description: 'Активна ли интеграция', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Тестовый режим', default: true })
  @IsOptional()
  @IsBoolean()
  isTestMode?: boolean;

  // ЮKassa
  @ApiPropertyOptional({ description: 'ID магазина в ЮKassa' })
  @IsOptional()
  @IsString()
  yookassaShopId?: string;

  @ApiPropertyOptional({ description: 'Секретный ключ ЮKassa' })
  @IsOptional()
  @IsString()
  yookassaSecretKey?: string;

  // CloudPayments
  @ApiPropertyOptional({ description: 'Публичный ID CloudPayments' })
  @IsOptional()
  @IsString()
  cloudpaymentsPublicId?: string;

  @ApiPropertyOptional({ description: 'API секрет CloudPayments' })
  @IsOptional()
  @IsString()
  cloudpaymentsApiSecret?: string;

  // Сбербанк
  @ApiPropertyOptional({ description: 'Логин Сбербанк' })
  @IsOptional()
  @IsString()
  sberbankLogin?: string;

  @ApiPropertyOptional({ description: 'Пароль Сбербанк' })
  @IsOptional()
  @IsString()
  sberbankPassword?: string;

  @ApiPropertyOptional({ description: 'Токен Сбербанк' })
  @IsOptional()
  @IsString()
  sberbankToken?: string;

  @ApiPropertyOptional({ description: 'Мерчант логин Сбербанк' })
  @IsOptional()
  @IsString()
  sberbankMerchantLogin?: string;

  // Альфа-банк
  @ApiPropertyOptional({ description: 'Логин Альфа-банк' })
  @IsOptional()
  @IsString()
  alfabankLogin?: string;

  @ApiPropertyOptional({ description: 'Пароль Альфа-банк' })
  @IsOptional()
  @IsString()
  alfabankPassword?: string;

  @ApiPropertyOptional({ description: 'Токен Альфа-банк' })
  @IsOptional()
  @IsString()
  alfabankToken?: string;

  @ApiPropertyOptional({ description: 'Refresh токен Альфа-банк' })
  @IsOptional()
  @IsString()
  alfabankRefreshToken?: string;

  @ApiPropertyOptional({ description: 'ID мерчанта Альфа-банк' })
  @IsOptional()
  @IsString()
  alfabankGatewayMerchantId?: string;

  @ApiPropertyOptional({ description: 'URL API Альфа-банк' })
  @IsOptional()
  @IsString()
  alfabankRestApiUrl?: string;

  // СБП
  @ApiPropertyOptional({ description: 'ID мерчанта СБП' })
  @IsOptional()
  @IsString()
  sbpMerchantId?: string;

  @ApiPropertyOptional({ description: 'Секретный ключ СБП' })
  @IsOptional()
  @IsString()
  sbpSecretKey?: string;

  @ApiPropertyOptional({ description: 'Название банка СБП' })
  @IsOptional()
  @IsString()
  sbpBankName?: string;

  @ApiPropertyOptional({ description: 'URL API СБП' })
  @IsOptional()
  @IsString()
  sbpApiUrl?: string;

  @ApiPropertyOptional({ description: 'ID эмитента QR СБП' })
  @IsOptional()
  @IsString()
  sbpQrIssuerId?: string;

  // Тинькофф
  @ApiPropertyOptional({ description: 'Терминальный ключ Тинькофф' })
  @IsOptional()
  @IsString()
  tinkoffTerminalKey?: string;

  @ApiPropertyOptional({ description: 'Пароль Тинькофф' })
  @IsOptional()
  @IsString()
  tinkoffPassword?: string;

  // URLы
  @ApiPropertyOptional({ description: 'URL для вебхуков' })
  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @ApiPropertyOptional({ description: 'URL успешной оплаты' })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional({ description: 'URL неуспешной оплаты' })
  @IsOptional()
  @IsString()
  failUrl?: string;
}