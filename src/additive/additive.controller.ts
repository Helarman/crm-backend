import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Query
} from '@nestjs/common';
import { AdditiveService } from './additive.service';
import { CreateAdditiveDto } from './dto/create-additive.dto';
import { UpdateAdditiveDto } from './dto/update-additive.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AdditiveWithProducts, AdditiveWithRelations } from './interfaces/additive.interface'
import { UpdateProductAdditivesDto } from './dto/update-product-additives.dto'

@ApiTags('Модификаторы к блюдам')
@Controller('additives')
export class AdditiveController {
  constructor(private readonly additiveService: AdditiveService) { }

  @Post(':additiveId/products/:productId')
  @ApiOperation({ summary: 'Добавить модификатор к продукту' })
  @ApiParam({ name: 'additiveId', description: 'ID Модификаторы' })
  @ApiParam({ name: 'productId', description: 'ID продукта' })
  @ApiResponse({ status: 200, description: 'Модификатор привязана к продукту' })
  addToProduct(
    @Param('additiveId') additiveId: string,
    @Param('productId') productId: string,
  ): Promise<AdditiveWithProducts> {
    return this.additiveService.addToProduct(additiveId, productId);
  }

  @Delete(':additiveId/products/:productId')
  @ApiOperation({ summary: 'Удалить модификатор из продукта' })
  @ApiParam({ name: 'additiveId', description: 'ID Модификаторы' })
  @ApiParam({ name: 'productId', description: 'ID продукта' })
  @ApiResponse({ status: 200, description: 'Модификатор отвязана от продукта' })
  removeFromProduct(
    @Param('additiveId') additiveId: string,
    @Param('productId') productId: string,
  ): Promise<AdditiveWithProducts> {
    return this.additiveService.removeFromProduct(additiveId, productId);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Получить Модификаторы продукта' })
  @ApiParam({ name: 'productId', description: 'ID продукта' })
  async getProductAdditives(@Param('productId') productId: string) {
    return this.additiveService.getProductAdditives(productId);
  }

  @Put('product/:productId')
  @ApiOperation({ summary: 'Обновить Модификаторы продукта' })
  @ApiParam({ name: 'productId', description: 'ID продукта' })
  @ApiBody({ type: UpdateProductAdditivesDto })
  @ApiResponse({ status: 200, description: 'Обновленные Модификаторы продукта' })
  @ApiResponse({ status: 404, description: 'Продукт не найден' })
  async updateProductAdditives(
    @Param('productId') productId: string,
    @Body() updateDto: UpdateProductAdditivesDto,
  ): Promise<AdditiveWithProducts[]> {
    return this.additiveService.updateProductAdditives(productId, updateDto.additiveIds);
  }

  @Get('network/:networkId')
  @ApiOperation({ summary: 'Получить модификаторы по сети' })
  @ApiParam({ name: 'networkId', description: 'ID сети' })
  @ApiResponse({ status: 200, description: 'Список модификаторов сети' })
  getByNetwork(@Param('networkId') networkId: string): Promise<AdditiveWithProducts[]> {
    return this.additiveService.getByNetwork(networkId);
  }

  @Get('network/:networkId/available')
  @ApiOperation({ summary: 'Получить доступные модификаторы по сети (с пагинацией)' })
  @ApiParam({ name: 'networkId', description: 'ID сети' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Лимит на страницу' })
  @ApiResponse({ status: 200, description: 'Пагинированный список модификаторов сети' })
  getByNetworkPaginated(
    @Param('networkId') networkId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ): Promise<{ data: AdditiveWithProducts[]; total: number; page: number; limit: number }> {
    return this.additiveService.getByNetworkPaginated(networkId, page, limit);
  }

  @Get('with-inventory')
  @ApiOperation({ summary: 'Получить модификаторы с привязанными инвентарными товарами' })
  @ApiResponse({ status: 200, description: 'Список модификаторов с инвентарем' })
  getAdditivesWithInventory(): Promise<AdditiveWithRelations[]> {
    return this.additiveService.getAdditivesWithInventory();
  }

  @Get('inventory/:inventoryItemId')
  @ApiOperation({ summary: 'Получить модификаторы по инвентарному товару' })
  @ApiParam({ name: 'inventoryItemId', description: 'ID инвентарного товара' })
  @ApiResponse({ status: 200, description: 'Список модификаторов привязанных к товару' })
  getByInventoryItem(@Param('inventoryItemId') inventoryItemId: string): Promise<AdditiveWithRelations[]> {
    return this.additiveService.getByInventoryItem(inventoryItemId);
  }

  @Post()
  @ApiOperation({ summary: 'Создать новый модификатор' })
  @ApiResponse({ status: 201, description: 'Модификатор успешно создан' })
  @ApiBody({ type: CreateAdditiveDto })
  create(@Body() createAdditiveDto: CreateAdditiveDto): Promise<AdditiveWithRelations> {
    return this.additiveService.create(createAdditiveDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все модификаторы' })
  @ApiResponse({ status: 200, description: 'Список всех модификаторов' })
  findAll(): Promise<AdditiveWithRelations[]> {
    return this.additiveService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить модификатор по ID' })
  @ApiParam({ name: 'id', description: 'ID модификатора' })
  @ApiResponse({ status: 200, description: 'Найденный модификатор' })
  @ApiResponse({ status: 404, description: 'Модификатор не найден' })
  findOne(@Param('id') id: string): Promise<AdditiveWithRelations | null> {
    return this.additiveService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить модификатор' })
  @ApiParam({ name: 'id', description: 'ID модификатора' })
  @ApiBody({ type: UpdateAdditiveDto })
  @ApiResponse({ status: 200, description: 'Обновленный модификатор' })
  update(
    @Param('id') id: string,
    @Body() updateAdditiveDto: UpdateAdditiveDto,
  ): Promise<AdditiveWithRelations> {
    return this.additiveService.update(id, updateAdditiveDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить модификатор' })
  @ApiParam({ name: 'id', description: 'ID модификатора' })
  @ApiResponse({ status: 200, description: 'Удаленный модификатор' })
  remove(@Param('id') id: string): Promise<AdditiveWithRelations> {
    return this.additiveService.remove(id);
  }

}