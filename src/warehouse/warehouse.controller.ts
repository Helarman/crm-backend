import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { ApiTags, ApiOperation, ApiResponse, ApiOkResponse } from '@nestjs/swagger';

@ApiTags('Warehouse')
@Controller('warehouse')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Get('items')
  @ApiOperation({ summary: 'Получить все позиции склада' })
  @ApiOkResponse({ description: 'Список позиций склада'})
  async getAllInventoryItems() {
    return this.warehouseService.getAllInventoryItems();
  }

  @Get('restaurant/:id')
  @ApiOperation({ summary: 'Получить склад ресторана' })
  @ApiResponse({ status: 200, description: 'Склад найден' })
  async getRestaurantWarehouse(@Param('id') restaurantId: string) {
    return this.warehouseService.getRestaurantWarehouse(restaurantId);
  }

  @Post()
  @ApiOperation({ summary: 'Создать склад' })
  @ApiResponse({ status: 201, description: 'Склад создан' })
  async createWarehouse(@Body() data: { restaurantId: string; name: string; description?: string }) {
    return this.warehouseService.createWarehouse(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить склад' })
  @ApiResponse({ status: 200, description: 'Склад обновлен' })
  async updateWarehouse(
    @Param('id') id: string,
    @Body() data: { name?: string; description?: string; isActive?: boolean },
  ) {
    return this.warehouseService.updateWarehouse(id, data);
  }

  // Storage Locations
  @Post(':warehouseId/locations')
  @ApiOperation({ summary: 'Добавить место хранения' })
  @ApiResponse({ status: 201, description: 'Место хранения добавлено' })
  async addStorageLocation(
    @Param('warehouseId') warehouseId: string,
    @Body() data: { name: string; code?: string; description?: string },
  ) {
    return this.warehouseService.addStorageLocation(warehouseId, data);
  }

  @Put('locations/:id')
  @ApiOperation({ summary: 'Обновить место хранения' })
  @ApiResponse({ status: 200, description: 'Место хранения обновлено' })
  async updateStorageLocation(
    @Param('id') id: string,
    @Body() data: { name?: string; code?: string; description?: string; isActive?: boolean },
  ) {
    return this.warehouseService.updateStorageLocation(id, data);
  }

  @Delete('locations/:id')
  @ApiOperation({ summary: 'Удалить место хранения' })
  @ApiResponse({ status: 200, description: 'Место хранения удалено' })
  async deleteStorageLocation(@Param('id') id: string) {
    return this.warehouseService.deleteStorageLocation(id);
  }

  // Inventory Items
  @Post(':warehouseId/items')
  @ApiOperation({ summary: 'Добавить позицию на склад' })
  @ApiResponse({ status: 201, description: 'Позиция добавлена' })
  async addInventoryItem(
    @Param('warehouseId') warehouseId: string,
    @Body() data: {
      name: string;
      description?: string;
      unit: string;
      quantity?: number;
      minQuantity?: number;
      cost?: number;
      storageLocationId?: string;
      productId?: string;
    },
  ) {
    return this.warehouseService.addInventoryItem(warehouseId, data);
  }

  @Put('items/:id')
  @ApiOperation({ summary: 'Обновить позицию на складе' })
  @ApiResponse({ status: 200, description: 'Позиция обновлена' })
  async updateInventoryItem(
    @Param('id') id: string,
    @Body() data: {
      name?: string;
      description?: string;
      unit?: string;
      minQuantity?: number;
      cost?: number;
      storageLocationId?: string;
      productId?: string;
      isActive?: boolean;
    },
  ) {
    return this.warehouseService.updateInventoryItem(id, data);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Удалить позицию со склада' })
  @ApiResponse({ status: 200, description: 'Позиция удалена' })
  async deleteInventoryItem(@Param('id') id: string) {
    return this.warehouseService.deleteInventoryItem(id);
  }

  @Get('items/product/:productId')
  @ApiOperation({ summary: 'Получить позиции склада по продукту' })
  @ApiResponse({ status: 200, description: 'Позиции найдены' })
  async getInventoryItemsByProduct(@Param('productId') productId: string) {
    return this.warehouseService.getInventoryItemsByProduct(productId);
  }

  // Inventory Transactions
  @Post('items/:id/receive')
  @ApiOperation({ summary: 'Добавить количество к позиции' })
  @ApiResponse({ status: 201, description: 'Количество добавлено' })
  async receiveInventory(
    @Param('id') id: string,
    @Body() data: { quantity: number; reason?: string; documentId?: string; userId?: string },
  ) {
    return this.warehouseService.receiveInventory(id, data);
  }

  @Post('items/:id/write-off')
  @ApiOperation({ summary: 'Списать количество с позиции' })
  @ApiResponse({ status: 201, description: 'Количество списано' })
  async writeOffInventory(
    @Param('id') id: string,
    @Body() data: { quantity: number; reason?: string; documentId?: string; userId?: string },
  ) {
    return this.warehouseService.writeOffInventory(id, data);
  }

  @Post('items/bulk/receive')
  @ApiOperation({ summary: 'Массовое добавление количества к позициям' })
  @ApiResponse({ status: 201, description: 'Количество добавлено' })
  async bulkReceiveInventory(
    @Body() data: Array<{ id: string; quantity: number; reason?: string; documentId?: string }>,
    @Body('userId') userId?: string,
  ) {
    return this.warehouseService.bulkReceiveInventory(data, userId);
  }

  @Post('items/bulk/write-off')
  @ApiOperation({ summary: 'Массовое списание количества с позиций' })
  @ApiResponse({ status: 201, description: 'Количество списано' })
  async bulkWriteOffInventory(
    @Body() data: Array<{ id: string; quantity: number; reason?: string; documentId?: string }>,
    @Body('userId') userId?: string,
  ) {
    return this.warehouseService.bulkWriteOffInventory(data, userId);
  }

  @Get('items/:id/transactions')
  @ApiOperation({ summary: 'Получить историю операций по позиции' })
  @ApiResponse({ status: 200, description: 'История операций найдена' })
  async getInventoryItemTransactions(@Param('id') id: string) {
    return this.warehouseService.getInventoryItemTransactions(id);
  }
  
  @Get('transactions/restaurant/:id')
  @ApiOperation({ summary: 'Получить транзакции склада ресторана по периоду дат' })
  @ApiResponse({ status: 200, description: 'Транзакции найдены' })
  async getWarehouseTransactionsByPeriod(
    @Param('id') restaurantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.warehouseService.getWarehouseTransactionsByPeriod(restaurantId, startDate, endDate);
  }
  
  @Post('premixes')
  @ApiOperation({ summary: 'Создать новую заготовку' })
  @ApiResponse({ status: 201, description: 'Заготовка создана' })
  async createPremix(
    @Body()
    data: {
      name: string;
      description?: string;
      unit: string;
      yield?: number;
      ingredients: Array<{
        inventoryItemId: string;
        quantity: number;
      }>;
      warehouseId: string;
    },
  ) {
    return this.warehouseService.createPremix(data);
  }

  @Post('premixes/:id/prepare')
  @ApiOperation({ summary: 'Приготовить заготовку' })
  @ApiResponse({ status: 201, description: 'Заготовка приготовлена' })
  async preparePremix(
    @Param('id') premixId: string,
    @Body() data: { quantity: number; userId?: string },
  ) {
    return this.warehouseService.preparePremix(
      premixId,
      data.quantity,
      data.userId,
    );
  }

  @Get('premixes/:id')
  @ApiOperation({ summary: 'Получить детали заготовки' })
  @ApiResponse({ status: 200, description: 'Детали заготовки' })
  async getPremixDetails(@Param('id') premixId: string) {
    return this.warehouseService.getPremixDetails(premixId);
  }

  @Get('premixes')
  @ApiOperation({ summary: 'Получить список заготовок' })
  @ApiResponse({ status: 200, description: 'Список заготовок' })
  async listPremixes(@Query('warehouseId') warehouseId?: string) {
    return this.warehouseService.listPremixes(warehouseId);
  }

}