import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Param,
  Get,
  Query,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('customers')
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post('request-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Запрос кода подтверждения по телефону' })
  async requestVerificationCode(
    @Body() dto: { phone: string; networkId: string },
  ) {
    return this.customerService.requestCode(dto.phone, dto.networkId);
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Проверка кода подтверждения' })
  async verifyCode(
    @Body() dto: { phone: string; code: string; networkId: string },
  ) {
    return this.customerService.verifyCode(dto.phone, dto.code, dto.networkId);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновление токена доступа' })
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.customerService.refreshTokens(refreshToken);
  }

  @Get('short-code/:code')
  @ApiOperation({ summary: 'Получить клиента по короткому коду' })
  async getCustomerByShortCode(@Param('code') code: string) {
    return this.customerService.getCustomerByShortCode(code);
  }

  @Get('search/:phone')
  @ApiOperation({ summary: 'Поиск клиента по телефону во всех сетях' })
  async findCustomerInAnyNetwork(@Param('phone') phone: string) {
    const customers = await this.customerService.findCustomerInAnyNetwork(phone);
    return {
      data: customers,
    };
  }

  @Get('networks/:networkId/customers')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить всех клиентов в сети' })
  async getAllCustomers(
    @Param('networkId') networkId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.customerService.getAllCustomers(networkId, page, limit);
  }

  @Get('networks/:networkId/customers/:phone')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить клиента по телефону в сети' })
  async getCustomerByPhone(
    @Param('networkId') networkId: string,
    @Param('phone') phone: string,
  ) {
    return this.customerService.getCustomerByPhone(phone, networkId);
  }

  @Post(':customerId/short-code')
 
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Генерация короткого кода для клиента' })
  async generateShortCode(@Param('customerId') customerId: string) {
    return this.customerService.generateNewShortCode(customerId);
  }

  @Get(':customerId/summary')
 
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Сводная информация о лояльности клиента' })
  async getLoyaltySummary(@Param('customerId') customerId: string) {
    return this.customerService.getCustomerLoyaltySummary(customerId);
  }

  // ========== ПЕРСОНАЛЬНЫЕ СКИДКИ ==========

  @Get(':customerId/discounts')
 
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить все персональные скидки клиента' })
  async getPersonalDiscounts(@Param('customerId') customerId: string) {
    const discounts = await this.customerService.getCustomerPersonalDiscounts(customerId);
    return {
      data: discounts,
    };
  }

  @Get(':customerId/discounts/:restaurantId')
 
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить персональную скидку для ресторана' })
  async getPersonalDiscount(
    @Param('customerId') customerId: string,
    @Param('restaurantId') restaurantId: string,
  ) {
    return this.customerService.getPersonalDiscount(customerId, restaurantId);
  }

  @Patch(':customerId/discounts/:restaurantId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Установить/обновить персональную скидку' })
  async setPersonalDiscount(
    @Param('customerId') customerId: string,
    @Param('restaurantId') restaurantId: string,
    @Body() body: { discount: number },
  ) {
    return this.customerService.setPersonalDiscount(customerId, restaurantId, body.discount);
  }

  // ========== БОНУСНЫЕ БАЛЛЫ ==========

  @Get(':customerId/bonuses')
 
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить все бонусные балансы клиента' })
  async getBonusBalances(@Param('customerId') customerId: string) {
    return this.customerService.getCustomerBonusBalances(customerId);
  }

  @Get(':customerId/bonuses/:networkId')
 
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить бонусный баланс в сети' })
  async getBonusBalance(
    @Param('customerId') customerId: string,
    @Param('networkId') networkId: string,
  ) {
    return this.customerService.getBonusBalance(customerId, networkId);
  }

  @Post(':customerId/bonuses/:networkId/earn')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Начислить бонусные баллы' })
  async earnBonusPoints(
    @Param('customerId') customerId: string,
    @Param('networkId') networkId: string,
    @Body() body: { amount: number; orderId?: string; description?: string },
  ) {
    return this.customerService.earnBonusPoints(
      customerId,
      networkId,
      body.amount,
      body.orderId,
      body.description,
    );
  }

  @Post(':customerId/bonuses/:networkId/spend')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Списать бонусные баллы' })
  async spendBonusPoints(
    @Param('customerId') customerId: string,
    @Param('networkId') networkId: string,
    @Body() body: { amount: number; orderId?: string; description?: string },
  ) {
    return this.customerService.spendBonusPoints(
      customerId,
      networkId,
      body.amount,
      body.orderId,
      body.description,
    );
  }

  @Patch(':customerId/bonuses/:networkId/adjust')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Корректировка бонусного баланса' })
  async adjustBonusBalance(
    @Param('customerId') customerId: string,
    @Param('networkId') networkId: string,
    @Body() body: { amount: number; reason: string },
  ) {
    return this.customerService.adjustBonusBalance(
      customerId,
      networkId,
      body.amount,
      body.reason,
    );
  }

  @Get(':customerId/transactions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить историю транзакций' })
  async getTransactions(
    @Param('customerId') customerId: string,
    @Query('networkId') networkId?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.customerService.getBonusTransactions(customerId, networkId, page, limit);
  }
}