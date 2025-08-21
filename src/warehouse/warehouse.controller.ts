import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import {
  WarehouseDto,
  CreateWarehouseDto,
  UpdateWarehouseDto,
  StorageLocationDto,
  CreateStorageLocationDto,
  UpdateStorageLocationDto,
  InventoryItemDto,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  WarehouseItemDto,
  CreateWarehouseItemDto,
  UpdateWarehouseItemDto,
  InventoryTransactionDto,
  CreateInventoryTransactionDto,
  PremixDto,
  CreatePremixDto,
  UpdatePremixDto,
  PremixIngredientDto,
  AddPremixIngredientDto,
  ProductIngredientDto,
  AddProductIngredientDto,
  InventoryAvailabilityDto,
} from './dto/warehouse.dto';
import { InventoryTransactionType } from '@prisma/client';

@ApiTags('Warehouse Management')
@Controller('warehouses')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  // ==================== Warehouse Endpoints ====================

  @Post()
  @ApiOperation({ summary: 'Create a new warehouse' })
  @ApiResponse({ status: 201, description: 'Warehouse created', type: WarehouseDto })
  async createWarehouse(@Body() data: CreateWarehouseDto) {
    return this.warehouseService.createWarehouse(data) ;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get warehouse by ID' })
  @ApiResponse({ status: 200, description: 'Warehouse found', type: WarehouseDto })
  async getWarehouse(@Param('id') id: string) {
    return this.warehouseService.getWarehouseById(id);
  }

  @Get('restaurant/:restaurantId')
  @ApiOperation({ summary: 'Get warehouse by restaurant ID' })
  @ApiResponse({ status: 200, description: 'Warehouse found', type: WarehouseDto })
  async getRestaurantWarehouse(@Param('restaurantId') restaurantId: string) {
    return this.warehouseService.getRestaurantWarehouse(restaurantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse updated', type: WarehouseDto })
  async updateWarehouse(
    @Param('id') id: string,
    @Body() data: UpdateWarehouseDto,
  ) {
    return this.warehouseService.updateWarehouse(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse deleted' })
  async deleteWarehouse(@Param('id') id: string) {
    return this.warehouseService.deleteWarehouse(id);
  }

  // ==================== Storage Location Endpoints ====================

  @Post(':warehouseId/locations')
  @ApiOperation({ summary: 'Create storage location' })
  @ApiResponse({ status: 201, description: 'Storage location created', type: StorageLocationDto })
  async createStorageLocation(
    @Param('warehouseId') warehouseId: string,
    @Body() data: CreateStorageLocationDto,
  ) {
    return this.warehouseService.createStorageLocation({
      ...data,
      warehouse: { connect: { id: warehouseId } },
    });
  }

  @Get('locations/:id')
  @ApiOperation({ summary: 'Get storage location by ID' })
  @ApiResponse({ status: 200, description: 'Storage location found', type: StorageLocationDto })
  async getStorageLocation(@Param('id') id: string) {
    return this.warehouseService.getStorageLocationById(id);
  }

  @Put('locations/:id')
  @ApiOperation({ summary: 'Update storage location' })
  @ApiResponse({ status: 200, description: 'Storage location updated', type: StorageLocationDto })
  async updateStorageLocation(
    @Param('id') id: string,
    @Body() data: UpdateStorageLocationDto,
  ) {
    return this.warehouseService.updateStorageLocation(id, data);
  }

  @Delete('locations/:id')
  @ApiOperation({ summary: 'Delete storage location' })
  @ApiResponse({ status: 200, description: 'Storage location deleted' })
  async deleteStorageLocation(@Param('id') id: string) {
    return this.warehouseService.deleteStorageLocation(id);
  }

  // ==================== Inventory Item Endpoints ====================

  @Post('items')
  @ApiOperation({ summary: 'Create inventory item' })
  @ApiResponse({ status: 201, description: 'Inventory item created', type: InventoryItemDto })
  async createInventoryItem(@Body() data: CreateInventoryItemDto) {
    return this.warehouseService.createInventoryItem(data);
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Get inventory item by ID' })
  @ApiResponse({ status: 200, description: 'Inventory item found', type: InventoryItemDto })
  async getInventoryItem(@Param('id') id: string) {
    return this.warehouseService.getInventoryItemById(id);
  }

  @Put('items/:id')
  @ApiOperation({ summary: 'Update inventory item' })
  @ApiResponse({ status: 200, description: 'Inventory item updated', type: InventoryItemDto })
  async updateInventoryItem(
    @Param('id') id: string,
    @Body() data: UpdateInventoryItemDto,
  ) {
    return this.warehouseService.updateInventoryItem(id, data);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Delete inventory item' })
  @ApiResponse({ status: 200, description: 'Inventory item deleted' })
  async deleteInventoryItem(@Param('id') id: string) {
    return this.warehouseService.deleteInventoryItem(id);
  }

  // ==================== Warehouse Item Endpoints ====================

  @Post('warehouse-items')
  @ApiOperation({ summary: 'Create warehouse item' })
  @ApiResponse({ status: 201, description: 'Warehouse item created', type: WarehouseItemDto })
  async createWarehouseItem(@Body() data: CreateWarehouseItemDto) {
    return this.warehouseService.createWarehouseItem(data);
  }

  @Get('warehouse-items/:id')
  @ApiOperation({ summary: 'Get warehouse item by ID' })
  @ApiResponse({ status: 200, description: 'Warehouse item found', type: WarehouseItemDto })
  async getWarehouseItem(@Param('id') id: string) {
    return this.warehouseService.getWarehouseItemById(id);
  }

  @Put('warehouse-items/:id')
  @ApiOperation({ summary: 'Update warehouse item' })
  @ApiResponse({ status: 200, description: 'Warehouse item updated', type: WarehouseItemDto })
  async updateWarehouseItem(
    @Param('id') id: string,
    @Body() data: UpdateWarehouseItemDto,
  ) {
    return this.warehouseService.updateWarehouseItem(id, data);
  }

  @Delete('warehouse-items/:id')
  @ApiOperation({ summary: 'Delete warehouse item' })
  @ApiResponse({ status: 200, description: 'Warehouse item deleted' })
  async deleteWarehouseItem(@Param('id') id: string) {
    return this.warehouseService.deleteWarehouseItem(id);
  }

  // ==================== Inventory Transaction Endpoints ====================

  @Post('transactions')
  @ApiOperation({ summary: 'Create inventory transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created', type: InventoryTransactionDto })
  async createInventoryTransaction(@Body() data: CreateInventoryTransactionDto) {
    return this.warehouseService.createTransaction(data);
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiResponse({ status: 200, description: 'Transaction found', type: InventoryTransactionDto })
  async getInventoryTransaction(@Param('id') id: string) {
    return this.warehouseService.getInventoryTransactionById(id);
  }

  @Get('items/:itemId/transactions')
  @ApiOperation({ summary: 'Get transactions for inventory item' })
  @ApiResponse({ status: 200, description: 'Transactions found', type: [InventoryTransactionDto] })
  async getItemTransactions(@Param('itemId') itemId: string) {
    return this.warehouseService.getInventoryTransactionsByItem(itemId);
  }

  @Get('warehouse/:warehouseId/transactions')
  @ApiOperation({ summary: 'Get transactions for warehouse' })
  @ApiResponse({ status: 200, description: 'Transactions found', type: [InventoryTransactionDto] })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'type', required: false, enum: InventoryTransactionType })
  async getWarehouseTransactions(
    @Param('warehouseId') warehouseId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: InventoryTransactionType,
  ) {
    return this.warehouseService.getWarehouseTransactions(warehouseId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      type,
    });
  }

  // ==================== Premix Endpoints ====================

 @Post('premixes')
@ApiOperation({ summary: 'Create premix' })
@ApiResponse({ status: 201, description: 'Premix created', type: PremixDto })
async createPremix(@Body() data: CreatePremixDto) {
  const prismaData = {
    ...data,
    ingredients: {
      create: data.ingredients.map(ing => ({
        inventoryItem: { connect: { id: ing.inventoryItemId } },
        quantity: ing.quantity
      }))
    }
  };
  
  return this.warehouseService.createPremix(prismaData);
}

  @Get('premixes/:id')
  @ApiOperation({ summary: 'Get premix by ID' })
  @ApiResponse({ status: 200, description: 'Premix found', type: PremixDto })
  async getPremix(@Param('id') id: string) {
    return this.warehouseService.getPremixById(id);
  }

  @Put('premixes/:id')
  @ApiOperation({ summary: 'Update premix' })
  @ApiResponse({ status: 200, description: 'Premix updated', type: PremixDto })
  async updatePremix(
    @Param('id') id: string,
    @Body() data: UpdatePremixDto,
  ) {
    return this.warehouseService.updatePremix(id, data);
  }

  @Delete('premixes/:id')
  @ApiOperation({ summary: 'Delete premix' })
  @ApiResponse({ status: 200, description: 'Premix deleted' })
  async deletePremix(@Param('id') id: string) {
    return this.warehouseService.deletePremix(id);
  }

  @Post('premixes/:id/prepare')
  @ApiOperation({ summary: 'Prepare premix' })
  @ApiResponse({ status: 200, description: 'Premix prepared' })
  async preparePremix(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
    @Body('userId') userId?: string,
  ) {
    return this.warehouseService.preparePremix(id, quantity, userId);
  }

  // ==================== Premix Ingredient Endpoints ====================

  @Post('premixes/:premixId/ingredients')
  @ApiOperation({ summary: 'Add ingredient to premix' })
  @ApiResponse({ status: 201, description: 'Ingredient added', type: PremixIngredientDto })
  async addPremixIngredient(
    @Param('premixId') premixId: string,
    @Body() data: AddPremixIngredientDto,
  ) {
    return this.warehouseService.addPremixIngredient(
      premixId,
      data.inventoryItemId,
      data.quantity,
    );
  }

  @Put('premixes/:premixId/ingredients/:inventoryItemId')
  @ApiOperation({ summary: 'Update premix ingredient' })
  @ApiResponse({ status: 200, description: 'Ingredient updated', type: PremixIngredientDto })
  async updatePremixIngredient(
    @Param('premixId') premixId: string,
    @Param('inventoryItemId') inventoryItemId: string,
    @Body('quantity') quantity: number,
  ) {
    return this.warehouseService.updatePremixIngredient(
      premixId,
      inventoryItemId,
      quantity,
    );
  }

  @Delete('premixes/:premixId/ingredients/:inventoryItemId')
  @ApiOperation({ summary: 'Remove ingredient from premix' })
  @ApiResponse({ status: 200, description: 'Ingredient removed' })
  async removePremixIngredient(
    @Param('premixId') premixId: string,
    @Param('inventoryItemId') inventoryItemId: string,
  ) {
    return this.warehouseService.removePremixIngredient(
      premixId,
      inventoryItemId,
    );
  }

  // ==================== Product Ingredient Endpoints ====================

  @Post('products/:productId/ingredients')
  @ApiOperation({ summary: 'Add ingredient to product' })
  @ApiResponse({ status: 201, description: 'Ingredient added', type: ProductIngredientDto })
  async addProductIngredient(
    @Param('productId') productId: string,
    @Body() data: AddProductIngredientDto,
  ) {
    return this.warehouseService.addProductIngredient(
      productId,
      data.inventoryItemId,
      data.quantity,
    );
  }

  @Put('products/:productId/ingredients/:inventoryItemId')
  @ApiOperation({ summary: 'Update product ingredient' })
  @ApiResponse({ status: 200, description: 'Ingredient updated', type: ProductIngredientDto })
  async updateProductIngredient(
    @Param('productId') productId: string,
    @Param('inventoryItemId') inventoryItemId: string,
    @Body('quantity') quantity: number,
  ) {
    return this.warehouseService.updateProductIngredient(
      productId,
      inventoryItemId,
      quantity,
    );
  }

  @Delete('products/:productId/ingredients/:inventoryItemId')
  @ApiOperation({ summary: 'Remove ingredient from product' })
  @ApiResponse({ status: 200, description: 'Ingredient removed' })
  async removeProductIngredient(
    @Param('productId') productId: string,
    @Param('inventoryItemId') inventoryItemId: string,
  ) {
    return this.warehouseService.removeProductIngredient(
      productId,
      inventoryItemId,
    );
  }

  // ==================== Utility Endpoints ====================

  @Get('products/:productId/availability')
  @ApiOperation({ summary: 'Check product ingredients availability' })
  @ApiResponse({ status: 200, description: 'Availability checked', type: InventoryAvailabilityDto })
  async checkProductAvailability(
    @Param('productId') productId: string,
    @Query('quantity') quantity: number = 1,
  ) {
    return this.warehouseService.checkProductIngredientsAvailability(
      productId,
      Number(quantity),
    );
  }

  // ==================== Inventory Item List Endpoint ====================
@Get('items')
@ApiOperation({ summary: 'List all inventory items' })
@ApiResponse({ status: 200, description: 'List of inventory items', type: [InventoryItemDto] })
@ApiQuery({ name: 'search', required: false, description: 'Search term for item name' })
@ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
async listInventoryItems(
  @Query('search') search?: string,
  @Query('isActive') isActive?: boolean,
) {
  return this.warehouseService.listInventoryItems({
    search,
    isActive: isActive !== undefined ? Boolean(isActive) : undefined,
  });
}

// ==================== Storage Location List Endpoint ====================
@Get(':warehouseId/locations')
@ApiOperation({ summary: 'List storage locations for warehouse' })
@ApiResponse({ status: 200, description: 'List of storage locations', type: [StorageLocationDto] })
@ApiQuery({ name: 'search', required: false, description: 'Search term for location name or code' })
async listStorageLocations(
  @Param('warehouseId') warehouseId: string,
  @Query('search') search?: string,
) {
  return this.warehouseService.listStorageLocations(warehouseId, { search });
}

// ==================== Premix List Endpoint ====================
@Get('premixes')
@ApiOperation({ summary: 'List all premixes' })
@ApiResponse({ status: 200, description: 'List of premixes', type: [PremixDto] })
@ApiQuery({ name: 'search', required: false, description: 'Search term for premix name' })
async listPremixes(@Query('search') search?: string) {
  return this.warehouseService.listPremixes({ search });
}
}