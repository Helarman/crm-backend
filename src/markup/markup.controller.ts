import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MarkupDto } from './dto/markup.dto';
import { EnumOrderType as OrderType } from '@prisma/client';

@ApiTags('Наценки')
@Controller('markups')
export class MarkupController {
  constructor() {}

  @Post()
  @ApiOperation({ summary: 'Создать новую наценку' })
  @ApiBody({ type: MarkupDto })
  @ApiResponse({ status: 201, description: 'Наценка успешно создана' })
  createMarkup(@Body() dto: MarkupDto) {
    return true;
  }

  @Get('applicable')
  @ApiOperation({ summary: 'Получить доступные наценки для типа заказа' })
  @ApiQuery({ name: 'orderType', enum: OrderType, required: true })
  getApplicableMarkups(@Query('orderType') orderType: OrderType) {
    return true;
  }
}