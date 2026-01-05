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
import { OrderAdditiveService } from './order-additive.service';
import { CreateOrderAdditiveDto } from './dto/create-order-additive.dto';
import { UpdateOrderAdditiveDto } from './dto/update-order-additive.dto';
import { UpdateOrderAdditivesDto } from './dto/update-order-additives.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { OrderAdditiveWithRelations } from './interfaces/order-additive.interface';
import { OrderAdditiveType, EnumOrderType } from '@prisma/client';

@ApiTags('Модификаторы заказов')
@Controller('order-additives')
export class OrderAdditiveController {
  constructor(private readonly orderAdditiveService: OrderAdditiveService) { }

  @Post(':orderAdditiveId/orders/:orderId')
  @ApiOperation({ summary: 'Добавить модификатор к заказу' })
  @ApiParam({ name: 'orderAdditiveId', description: 'ID модификатора заказа' })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiResponse({ status: 200, description: 'Модификатор привязан к заказу' })
  addToOrder(
    @Param('orderAdditiveId') orderAdditiveId: string,
    @Param('orderId') orderId: string,
    @Query('quantity') quantity: number = 1,
  ): Promise<OrderAdditiveWithRelations> {
    return this.orderAdditiveService.addToOrder(orderAdditiveId, orderId, quantity);
  }

  @Delete(':orderAdditiveId/orders/:orderId')
  @ApiOperation({ summary: 'Удалить модификатор из заказа' })
  @ApiParam({ name: 'orderAdditiveId', description: 'ID модификатора заказа' })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiResponse({ status: 200, description: 'Модификатор отвязан от заказа' })
  removeFromOrder(
    @Param('orderAdditiveId') orderAdditiveId: string,
    @Param('orderId') orderId: string,
  ): Promise<OrderAdditiveWithRelations> {
    return this.orderAdditiveService.removeFromOrder(orderAdditiveId, orderId);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Получить модификаторы заказа' })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  async getOrderAdditives(@Param('orderId') orderId: string) {
    return this.orderAdditiveService.getOrderAdditives(orderId);
  }

  @Put('order/:orderId')
  @ApiOperation({ summary: 'Обновить модификаторы заказа' })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiBody({ type: UpdateOrderAdditivesDto })
  @ApiResponse({ status: 200, description: 'Обновленные модификаторы заказа' })
  @ApiResponse({ status: 404, description: 'Заказ не найден' })
  async updateOrderAdditives(
    @Param('orderId') orderId: string,
    @Body() updateDto: UpdateOrderAdditivesDto,
  ): Promise<any[]> {
    return this.orderAdditiveService.updateOrderAdditives(orderId, updateDto.orderAdditiveIds);
  }

  @Get('order-type/:orderType')
  @ApiOperation({ summary: 'Получить модификаторы по типу заказа' })
  @ApiParam({ name: 'orderType', description: 'Тип заказа', enum: EnumOrderType })
  @ApiQuery({ name: 'networkId', required: false, description: 'ID сети' })
  @ApiResponse({ status: 200, description: 'Список модификаторов для типа заказа' })
  getByOrderType(
    @Param('orderType') orderType: EnumOrderType,
    @Query('networkId') networkId?: string,
  ): Promise<OrderAdditiveWithRelations[]> {
    return this.orderAdditiveService.getByOrderTypeAndNetwork(orderType, networkId);
  }

  @Get('network/:networkId')
  @ApiOperation({ summary: 'Получить модификаторы заказов по сети' })
  @ApiParam({ name: 'networkId', description: 'ID сети' })
  @ApiResponse({ status: 200, description: 'Список модификаторов заказов сети' })
  getByNetwork(@Param('networkId') networkId: string): Promise<OrderAdditiveWithRelations[]> {
    return this.orderAdditiveService.getByNetwork(networkId);
  }

  @Get('network/:networkId/available')
  @ApiOperation({ summary: 'Получить доступные модификаторы заказов по сети (с пагинацией)' })
  @ApiParam({ name: 'networkId', description: 'ID сети' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Лимит на страницу' })
  @ApiQuery({ name: 'orderType', required: false, enum: EnumOrderType, description: 'Фильтр по типу заказа' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Фильтр по активности' })
  @ApiQuery({ name: 'type', required: false, enum: OrderAdditiveType, description: 'Фильтр по типу модификатора' })
  @ApiResponse({ status: 200, description: 'Пагинированный список модификаторов заказов сети' })
  getByNetworkPaginated(
    @Param('networkId') networkId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('orderType') orderType?: EnumOrderType,
    @Query('isActive') isActive?: boolean,
    @Query('type') type?: OrderAdditiveType,
  ): Promise<{ data: OrderAdditiveWithRelations[]; total: number; page: number; limit: number }> {
    return this.orderAdditiveService.getByNetworkPaginated(networkId, page, limit, {
      orderType,
      isActive,
      type
    });
  }

  @Get('with-inventory')
  @ApiOperation({ summary: 'Получить модификаторы заказов с привязанными инвентарными товарами' })
  @ApiResponse({ status: 200, description: 'Список модификаторов заказов с инвентарем' })
  getAdditivesWithInventory(): Promise<OrderAdditiveWithRelations[]> {
    return this.orderAdditiveService.getAdditivesWithInventory();
  }

  @Get('inventory/:inventoryItemId')
  @ApiOperation({ summary: 'Получить модификаторы заказов по инвентарному товару' })
  @ApiParam({ name: 'inventoryItemId', description: 'ID инвентарного товара' })
  @ApiResponse({ status: 200, description: 'Список модификаторов заказов привязанных к товару' })
  getByInventoryItem(@Param('inventoryItemId') inventoryItemId: string): Promise<OrderAdditiveWithRelations[]> {
    return this.orderAdditiveService.getByInventoryItem(inventoryItemId);
  }

  @Post()
  @ApiOperation({ summary: 'Создать новый модификатор заказа' })
  @ApiResponse({ status: 201, description: 'Модификатор заказа успешно создан' })
  @ApiBody({ type: CreateOrderAdditiveDto })
  create(@Body() createOrderAdditiveDto: CreateOrderAdditiveDto): Promise<OrderAdditiveWithRelations> {
    return this.orderAdditiveService.create(createOrderAdditiveDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все модификаторы заказов' })
  @ApiQuery({ name: 'networkId', required: false, description: 'ID сети' })
  @ApiQuery({ name: 'orderType', required: false, enum: EnumOrderType, description: 'Фильтр по типу заказа' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Фильтр по активности' })
  @ApiQuery({ name: 'type', required: false, enum: OrderAdditiveType, description: 'Фильтр по типу модификатора' })
  @ApiResponse({ status: 200, description: 'Список всех модификаторов заказов' })
  findAll(
    @Query('networkId') networkId?: string,
    @Query('orderType') orderType?: EnumOrderType,
    @Query('isActive') isActive?: boolean,
    @Query('type') type?: OrderAdditiveType,
  ): Promise<OrderAdditiveWithRelations[]> {
    return this.orderAdditiveService.findAll({
      networkId,
      orderType,
      isActive,
      type
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить модификатор заказа по ID' })
  @ApiParam({ name: 'id', description: 'ID модификатора заказа' })
  @ApiResponse({ status: 200, description: 'Найденный модификатор заказа' })
  @ApiResponse({ status: 404, description: 'Модификатор заказа не найден' })
  findOne(@Param('id') id: string): Promise<OrderAdditiveWithRelations | null> {
    return this.orderAdditiveService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить модификатор заказа' })
  @ApiParam({ name: 'id', description: 'ID модификатора заказа' })
  @ApiBody({ type: UpdateOrderAdditiveDto })
  @ApiResponse({ status: 200, description: 'Обновленный модификатор заказа' })
  update(
    @Param('id') id: string,
    @Body() updateOrderAdditiveDto: UpdateOrderAdditiveDto,
  ): Promise<OrderAdditiveWithRelations> {
    return this.orderAdditiveService.update(id, updateOrderAdditiveDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить модификатор заказа' })
  @ApiParam({ name: 'id', description: 'ID модификатора заказа' })
  @ApiResponse({ status: 200, description: 'Удаленный модификатор заказа' })
  remove(@Param('id') id: string): Promise<OrderAdditiveWithRelations> {
    return this.orderAdditiveService.remove(id);
  }

  @Get('order-type/:orderType/network/:networkId')
  @ApiOperation({ summary: 'Получить доступные модификаторы по типу заказа и сети' })
  @ApiParam({ name: 'orderType', description: 'Тип заказа', enum: EnumOrderType })
  @ApiParam({ name: 'networkId', description: 'ID сети' })
  @ApiResponse({ status: 200, description: 'Список доступных модификаторов' })
  getByOrderTypeAndNetwork(
    @Param('orderType') orderType: EnumOrderType,
    @Param('networkId') networkId: string,
  ): Promise<OrderAdditiveWithRelations[]> {
    return this.orderAdditiveService.getByOrderTypeAndNetwork(orderType, networkId);
  }
}