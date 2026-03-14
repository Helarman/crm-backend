// combo.controller.ts
import { 
  Body, 
  Controller, 
  Get, 
  Param, 
  Post, 
  Put, 
  Delete, 
  Query 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ComboService } from './combo.service';
import { 
  CreateComboDto, 
  UpdateComboDto, 
  CalculateComboPriceDto,
  OrderComboItemDto,
  ComboPriceCalculation
} from './dto/combo.dto';

@ApiTags('Комбо')
@Controller('combo')
export class ComboController {
  constructor(private readonly comboService: ComboService) {}

  @Post()
  @ApiOperation({ summary: 'Создать новое комбо' })
  @ApiResponse({ status: 201, description: 'Комбо успешно создано' })
  async createCombo(@Body() dto: CreateComboDto) {
    return this.comboService.createCombo(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все комбо' })
  async getAllCombos(@Query('search') search?: string) {
    return this.comboService.getAllCombos(search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить комбо по ID' })
  async getComboById(@Param('id') id: string) {
    return this.comboService.getComboById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить комбо' })
  async updateCombo(@Param('id') id: string, @Body() dto: UpdateComboDto) {
    return this.comboService.updateCombo(id, dto);
  }

  @Post('calculate-price')
  @ApiOperation({ summary: 'Рассчитать цену комбо' })
  async calculatePrice(@Body() dto: CalculateComboPriceDto): Promise<ComboPriceCalculation> {
    return this.comboService.calculateComboPrice(dto);
  }

  @Get(':id/available-products')
  @ApiOperation({ summary: 'Получить продукты, доступные для добавления в комбо' })
  async getAvailableProducts(@Param('id') id: string) {
    return this.comboService.getAvailableProductsForCombo(id);
  }

  @Get(':id/composition')
  @ApiOperation({ summary: 'Получить состав комбо' })
  async getComboComposition(@Param('id') id: string) {
    return this.comboService.getComboComposition(id);
  }

  @Get('product/:productId/parents')
  @ApiOperation({ summary: 'Получить комбо, в которые входит продукт' })
  async getProductParentCombos(@Param('productId') productId: string) {
    return this.comboService.getProductParentCombos(productId);
  }

}