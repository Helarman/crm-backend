import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody, 
  ApiParam, 
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConflictResponse
} from '@nestjs/swagger';
import { PaymentProviderType } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { PaymentIntegrationService } from './payment-integration.service';
import { CreatePaymentIntegrationDto } from './dto/create-payment-integration.dto';
import { UpdatePaymentIntegrationDto } from './dto/update-payment-integration.dto';

@ApiTags('Платежные интеграции')
@ApiBearerAuth()
@Controller('restaurants/:restaurantId/payment-integrations')
export class PaymentIntegrationController {
  constructor(
    private readonly paymentIntegrationService: PaymentIntegrationService
  ) {}

  @Post()
  @UsePipes(new ValidationPipe())
  @HttpCode(201)
  @Auth()
  @ApiOperation({ summary: 'Создать платежную интеграцию для ресторана' })
  @ApiParam({ name: 'restaurantId', description: 'ID ресторана' })
  @ApiBody({ type: CreatePaymentIntegrationDto })
  @ApiCreatedResponse({ description: 'Интеграция успешно создана' })
  @ApiNotFoundResponse({ description: 'Ресторан не найден' })
  @ApiConflictResponse({ description: 'Интеграция этого типа уже существует' })
  @ApiBadRequestResponse({ description: 'Некорректные данные' })
  async create(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreatePaymentIntegrationDto
  ) {
    return this.paymentIntegrationService.createIntegration(restaurantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все платежные интеграции ресторана' })
  @ApiParam({ name: 'restaurantId', description: 'ID ресторана' })
  @ApiOkResponse({ description: 'Список интеграций успешно получен' })
  @ApiNotFoundResponse({ description: 'Ресторан не найден' })
  async getRestaurantIntegrations(
    @Param('restaurantId') restaurantId: string
  ) {
    return this.paymentIntegrationService.getRestaurantIntegrations(restaurantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить интеграцию по ID' })
  @ApiParam({ name: 'restaurantId', description: 'ID ресторана' })
  @ApiParam({ name: 'id', description: 'ID интеграции' })
  @ApiOkResponse({ description: 'Интеграция найдена' })
  @ApiNotFoundResponse({ description: 'Интеграция не найдена' })
  async getIntegrationById(
    @Param('id') id: string
  ) {
    return this.paymentIntegrationService.getIntegrationById(id);
  }

  @Get('provider/:provider')
  @ApiOperation({ summary: 'Получить активную интеграцию по типу провайдера' })
  @ApiParam({ name: 'restaurantId', description: 'ID ресторана' })
  @ApiParam({ name: 'provider', enum: PaymentProviderType, description: 'Тип платежной системы' })
  @ApiOkResponse({ description: 'Интеграция найдена' })
  async getActiveIntegration(
    @Param('restaurantId') restaurantId: string,
    @Param('provider') provider: PaymentProviderType
  ) {
    return this.paymentIntegrationService.getActiveIntegration(restaurantId, provider);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe())
  @Auth()
  @ApiOperation({ summary: 'Обновить платежную интеграцию' })
  @ApiParam({ name: 'restaurantId', description: 'ID ресторана' })
  @ApiParam({ name: 'id', description: 'ID интеграции' })
  @ApiBody({ type: UpdatePaymentIntegrationDto })
  @ApiOkResponse({ description: 'Интеграция успешно обновлена' })
  @ApiNotFoundResponse({ description: 'Интеграция не найдена' })
  @ApiBadRequestResponse({ description: 'Некорректные данные' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentIntegrationDto
  ) {
    return this.paymentIntegrationService.updateIntegration(id, dto);
  }

  @Put(':id/toggle')
  @Auth()
  @ApiOperation({ summary: 'Включить/выключить интеграцию' })
  @ApiParam({ name: 'restaurantId', description: 'ID ресторана' })
  @ApiParam({ name: 'id', description: 'ID интеграции' })
  @ApiBody({ schema: { properties: { isActive: { type: 'boolean' } } } })
  @ApiOkResponse({ description: 'Статус интеграции изменен' })
  @ApiNotFoundResponse({ description: 'Интеграция не найдена' })
  async toggleStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean
  ) {
    return this.paymentIntegrationService.toggleIntegrationStatus(id, isActive);
  }

  @Delete(':id')
  @Auth()
  @ApiOperation({ summary: 'Удалить платежную интеграцию' })
  @ApiParam({ name: 'restaurantId', description: 'ID ресторана' })
  @ApiParam({ name: 'id', description: 'ID интеграции' })
  @ApiOkResponse({ description: 'Интеграция успешно удалена' })
  @ApiNotFoundResponse({ description: 'Интеграция не найдена' })
  async delete(
    @Param('id') id: string
  ) {
    return this.paymentIntegrationService.deleteIntegration(id);
  }
}