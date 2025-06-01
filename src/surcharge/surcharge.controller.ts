import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { SurchargeService } from './surcharge.service';
import { CreateSurchargeDto } from './dto/create-surcharge.dto';
import { UpdateSurchargeDto } from './dto/update-surcharge.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SurchargeResponseDto } from './dto/surcharge-response.dto';
import { EnumOrderType as OrderType} from '@prisma/client';

@ApiTags('Надбавки (Surcharges)')
@Controller('surcharges')
export class SurchargeController {
  constructor(private readonly surchargeService: SurchargeService) {}

  @Post()
  @ApiOperation({ summary: 'Создать новую надбавку' })
  @ApiResponse({ status: 201, description: 'Надбавка создана', type: SurchargeResponseDto })
  create(@Body() createSurchargeDto: CreateSurchargeDto) {
    if (typeof createSurchargeDto.amount === 'string') {
      createSurchargeDto.amount = Number(createSurchargeDto.amount);
    }
    return this.surchargeService.create(createSurchargeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список всех надбавок' })
  @ApiResponse({ status: 200, description: 'Список надбавок', type: [SurchargeResponseDto] })
  findAll() {
    return this.surchargeService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить надбавку по ID' })
  @ApiResponse({ status: 200, description: 'Надбавка', type: SurchargeResponseDto })
  @ApiResponse({ status: 404, description: 'Надбавка не найдена' })
  findOne(@Param('id') id: string) {
    return this.surchargeService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить надбавку' })
  @ApiResponse({ status: 200, description: 'Надбавка обновлена', type: SurchargeResponseDto })
  @ApiResponse({ status: 404, description: 'Надбавка не найдена' })
  update(@Param('id') id: string, @Body() updateSurchargeDto: UpdateSurchargeDto) {
       if (typeof updateSurchargeDto.amount === 'string') {
      updateSurchargeDto.amount = Number(updateSurchargeDto.amount);
    }
    return this.surchargeService.update(id, updateSurchargeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить надбавку' })
  @ApiResponse({ status: 200, description: 'Надбавка удалена' })
  @ApiResponse({ status: 404, description: 'Надбавка не найдена' })
  remove(@Param('id') id: string) {
    return this.surchargeService.remove(id);
  }

  @Get('for-order/:orderType')
  @ApiOperation({ summary: 'Получить надбавки для типа заказа' })
  @ApiQuery({ name: 'restaurantId', required: false, description: 'ID ресторана для фильтрации' })
  @ApiResponse({ status: 200, description: 'Список надбавок', type: [SurchargeResponseDto] })
  getForOrder(
    @Param('orderType') orderType: OrderType,
    @Query('restaurantId') restaurantId?: string
  ) {
    return this.surchargeService.getSurchargesForOrder(orderType, restaurantId);
  }
}