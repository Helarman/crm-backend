import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DiscountDto, ApplyDiscountDto } from './dto/discount.dto';
import { EnumOrderType as OrderType} from '@prisma/client'

@ApiTags('Скидки и промо')
@Controller('discounts')
export class DiscountController {
  constructor() {}

  @Post()
  @ApiOperation({ summary: 'Создать новую скидку/акцию' })
  @ApiBody({ type: DiscountDto })
  @ApiResponse({ status: 201, description: 'Скидка успешно создана' })
  createDiscount(@Body() dto: DiscountDto) {
    return true;
  }

  @Get('applicable')
  @ApiOperation({ summary: 'Получить доступные скидки для заказа' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'restaurantId', required: true })
  @ApiQuery({ name: 'orderType', enum: OrderType, required: true })
  getApplicableDiscounts(
    @Query('userId') userId: string,
    @Query('restaurantId') restaurantId: string,
    @Query('orderType') orderType: OrderType
  ) {
    return true;
  }

  @Post('apply')
  @ApiOperation({ summary: 'Применить скидку к заказу' })
  @ApiBody({ type: ApplyDiscountDto })
  @ApiResponse({ status: 200, description: 'Скидка успешно применена' })
  applyDiscount(@Body() dto: ApplyDiscountDto) {
    return true;
  }
}