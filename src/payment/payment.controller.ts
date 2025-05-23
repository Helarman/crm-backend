import { Controller, Get, Post, Param, Body, Patch } from '@nestjs/common';
import { PaymentsService } from './payment.service';
import { Payment } from '@prisma/client';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Платежи')
@Controller('payments')
export class PaymentsController { 
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Создать новый платеж' })
  @ApiResponse({ status: 201, description: 'Платеж успешно создан' })
  async create(@Body() createPaymentDto: CreatePaymentDto): Promise<Payment> {
    return this.paymentsService.create(createPaymentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все платежи' })
  @ApiResponse({ status: 200, description: 'Список платежей' })
  async findAll(): Promise<Payment[]> {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить платеж по ID' })
  @ApiResponse({ status: 200, description: 'Найденный платеж' })
  @ApiResponse({ status: 404, description: 'Платеж не найден' })
  async findOne(@Param('id') id: string): Promise<Payment> {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить платеж' })
  @ApiResponse({ status: 200, description: 'Обновленный платеж' })
  @ApiResponse({ status: 404, description: 'Платеж не найден' })
  async update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto): Promise<Payment> {
    return this.paymentsService.update(id, updatePaymentDto);
  }
  @Patch(':id/amount')
@ApiOperation({ summary: 'Обновить сумму платежа' })
@ApiResponse({ status: 200, description: 'Сумма платежа обновлена' })
@ApiResponse({ status: 400, description: 'Невозможно обновить сумму' })
@ApiResponse({ status: 404, description: 'Платеж не найден' })
async updateAmount(
  @Param('id') id: string,
  @Body() body: { amount: number },
): Promise<Payment> {
  return this.paymentsService.updateAmount(id, body.amount);
}

@Patch(':id/method')
@ApiOperation({ summary: 'Обновить метод оплаты' })
@ApiResponse({ status: 200, description: 'Метод оплаты обновлен' })
@ApiResponse({ status: 400, description: 'Невозможно обновить метод оплаты' })
@ApiResponse({ status: 404, description: 'Платеж не найден' })
async updateMethod(
  @Param('id') id: string,
  @Body() body: { method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER' },
): Promise<Payment> {
  return this.paymentsService.updateMethod(id, body.method);
}
}
