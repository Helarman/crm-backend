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
  BulkCreateWarehouseItemsDto,
  AddMissingItemsDto,
  UpdateInventoryCategoryDto,
  InventoryCategoryDto,
  CreateInventoryCategoryDto,
  BulkAssignNetworkDto,
} from './dto/warehouse.dto';
import { InventoryTransactionType } from '@prisma/client';

@ApiTags('Warehouse Management')
@Controller('warehouses')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) { }

  // ==================== Warehouse Endpoints ====================

  @Post()
  @ApiOperation({ summary: 'Create a new warehouse' })
  @ApiResponse({ status: 201, description: 'Warehouse created', type: WarehouseDto })
  async createWarehouse(@Body() data: CreateWarehouseDto) {
    return this.warehouseService.createWarehouse(data);
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

  @Get('items/all')
  @ApiOperation({ summary: 'Получить все позиции склада' })
  async getAllInventoryItems() {
    try {
      const result = await this.warehouseService.getAllInventoryItems();
      const ids = result.map(r => r.id)
      return ids;
    } catch (error) {
      throw error;
    }
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


  @Get(':warehouseId/items')
  @ApiOperation({ summary: 'Get warehouse items with full details' })
  @ApiResponse({
    status: 200,
    description: 'Warehouse items with full details',
    type: [WarehouseItemDto]
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for item name' })
  @ApiQuery({ name: 'lowStock', required: false, description: 'Filter low stock items only', type: Boolean })
  @ApiQuery({ name: 'storageLocationId', required: false, description: 'Filter by storage location' })
  async getWarehouseItems(
    @Param('warehouseId') warehouseId: string,
    @Query('search') search?: string,
    @Query('lowStock') lowStock?: boolean,
    @Query('storageLocationId') storageLocationId?: string,
  ) {
    return this.warehouseService.getWarehouseItemsWithDetails(warehouseId, {
      search,
      storageLocationId,
    });
  }

  @Get(':warehouseId/missing-items')
  @ApiOperation({ summary: 'Get inventory items not present in warehouse' })
  @ApiResponse({ status: 200, description: 'List of missing items', type: [InventoryItemDto] })
  async getMissingItems(@Param('warehouseId') warehouseId: string) {
    return this.warehouseService.getItemsNotInWarehouse(warehouseId);
  }

  @Get(':warehouseId/coverage')
  @ApiOperation({ summary: 'Get warehouse coverage statistics' })
  @ApiResponse({
    status: 200,
    description: 'Warehouse coverage information',
    schema: {
      type: 'object',
      properties: {
        totalActiveItems: { type: 'number' },
        itemsInWarehouse: { type: 'number' },
        coveragePercentage: { type: 'number' },
        missingCount: { type: 'number' },
        missingItems: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              unit: { type: 'string' }
            }
          }
        }
      }
    }
  })
  async getWarehouseCoverage(@Param('warehouseId') warehouseId: string) {
    return this.warehouseService.getWarehouseCoverage(warehouseId);
  }


  @Get('warehouses/:warehouseId/transfers')
  @ApiOperation({ summary: 'Get transfer transactions for warehouse' })
  @ApiResponse({ status: 200, description: 'Transfer transactions found', type: [InventoryTransactionDto] })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'direction', required: false, enum: ['incoming', 'outgoing', 'both'] })
  async getWarehouseTransfers(
    @Param('warehouseId') warehouseId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('direction') direction?: 'incoming' | 'outgoing' | 'both',
  ) {
    return this.warehouseService.getTransferTransactions(warehouseId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      direction,
    });
  }

  @Get('transfers')
  @ApiOperation({ summary: 'Get all transfer transactions' })
  @ApiResponse({ status: 200, description: 'Transfer transactions found', type: [InventoryTransactionDto] })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getAllTransfers(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.warehouseService.getTransferTransactions('', {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      direction: 'both',
    });
  }


  @Post(':warehouseId/add-missing-items')
  @ApiOperation({ summary: 'Add all missing inventory items to warehouse' })
  @ApiResponse({
    status: 201,
    description: 'Missing items added to warehouse',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['success', 'partial', 'error'] },
        message: { type: 'string' },
        totalMissing: { type: 'number' },
        added: { type: 'number' },
        errors: { type: 'number' },
        details: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              inventoryItemId: { type: 'string' },
              inventoryItemName: { type: 'string' },
              status: { type: 'string', enum: ['added', 'error'] },
              error: { type: 'string', nullable: true }
            }
          }
        }
      }
    }
  })
  async addMissingItems(
    @Param('warehouseId') warehouseId: string,
    @Body() data: Omit<AddMissingItemsDto, 'warehouseId'>
  ) {
    return this.warehouseService.addMissingItemsToWarehouse({
      warehouseId,
      ...data
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
  @Get(':warehouseId/premixes')
  @ApiOperation({ summary: 'Get premixes for warehouse with stock information' })
  @ApiResponse({ status: 200, description: 'Premixes with warehouse items', type: [PremixDto] })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for premix name' })
  async getWarehousePremixes(
    @Param('warehouseId') warehouseId: string,
    @Query('search') search?: string,
  ) {
    return this.warehouseService.getPremixesWithWarehouseItems(warehouseId, { search });
  }

  @Get(':warehouseId/premixes/:id')
  @ApiOperation({ summary: 'Get premix by ID with warehouse stock info' })
  @ApiResponse({ status: 200, description: 'Premix found with warehouse data', type: PremixDto })
  async getWarehousePremix(
    @Param('warehouseId') warehouseId: string,
    @Param('id') id: string,
  ) {
    return this.warehouseService.getPremixWithWarehouseInfo(id, warehouseId);
  }
  @Get(':warehouseId/premixes/:premixId/details')
  @ApiOperation({ summary: 'Get premix details with warehouse-specific information' })
  @ApiResponse({ status: 200, description: 'Premix details with warehouse data', type: PremixDto })
  async getPremixWithWarehouseDetails(
    @Param('warehouseId') warehouseId: string,
    @Param('premixId') premixId: string
  ) {
    return this.warehouseService.getPremixWithWarehouseDetails(premixId, warehouseId);
  }

  @Get(':warehouseId/premixes/:premixId/transactions')
  @ApiOperation({ summary: 'Get transactions for premix in specific warehouse' })
  @ApiResponse({ status: 200, description: 'Premix transactions', type: [InventoryTransactionDto] })
  async getPremixTransactions(
    @Param('warehouseId') warehouseId: string,
    @Param('premixId') premixId: string
  ) {
    return this.warehouseService.getPremixTransactions(premixId, warehouseId);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create inventory category' })
  @ApiResponse({ status: 201, description: 'Category created', type: InventoryCategoryDto })
  async createInventoryCategory(@Body() data: CreateInventoryCategoryDto) {
    return this.warehouseService.createInventoryCategory(data);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all inventory categories' })
  @ApiResponse({ status: 200, description: 'Categories found', type: [InventoryCategoryDto] })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiQuery({ name: 'parentId', required: false })
  async getInventoryCategories(
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: boolean,
    @Query('parentId') parentId?: string,
  ) {
    const data = this.warehouseService.getAllInventoryCategories({
      search,
      parentId: parentId === 'null' ? null : parentId,
    });
    return data;
  }

  @Get('categories/tree')
  @ApiOperation({ summary: 'Get category tree structure' })
  @ApiResponse({ status: 200, description: 'Category tree found', type: [InventoryCategoryDto] })
  async getCategoryTree() {
    return this.warehouseService.getCategoryTree();
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get inventory category by ID' })
  @ApiResponse({ status: 200, description: 'Category found', type: InventoryCategoryDto })
  async getInventoryCategory(@Param('id') id: string) {
    return this.warehouseService.getInventoryCategoryById(id);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Update inventory category' })
  @ApiResponse({ status: 200, description: 'Category updated', type: InventoryCategoryDto })
  async updateInventoryCategory(
    @Param('id') id: string,
    @Body() data: UpdateInventoryCategoryDto,
  ) {
    return this.warehouseService.updateInventoryCategory(id, data);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete inventory category' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  async deleteInventoryCategory(@Param('id') id: string) {
    return this.warehouseService.deleteInventoryCategory(id);
  }

  @Get('categories/:categoryId/items')
  @ApiOperation({ summary: 'Get inventory items by category' })
  @ApiResponse({ status: 200, description: 'Items found', type: [InventoryItemDto] })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiQuery({ name: 'warehouseId', required: false })
  async getItemsByCategory(
    @Param('categoryId') categoryId: string,
    @Query('includeInactive') includeInactive?: boolean,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.warehouseService.getInventoryItemsByCategory(categoryId, {
      warehouseId,
    });
  }


  @Post('items/bulk-assign-network')
  @ApiOperation({ summary: 'Массовое присваивание сети инвентарным позициям' })
  @ApiResponse({
    status: 200,
    description: 'Сеть успешно присвоена',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        total: { type: 'number' },
        processed: { type: 'number' },
        updated: { type: 'number' },
        skipped: { type: 'number' },
        errors: { type: 'number' },
        details: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              inventoryItemId: { type: 'string' },
              inventoryItemName: { type: 'string' },
              status: { type: 'string' },
              message: { type: 'string' }
            }
          }
        }
      }
    }
  })
  async bulkAssignNetworkToItems(@Body() data: BulkAssignNetworkDto) {
    return this.warehouseService.bulkAssignNetworkToItems(data);
  }

  @Get('network/:networkId/items')
  @ApiOperation({ summary: 'Получить инвентарные позиции по сети' })
  @ApiResponse({ status: 200, description: 'Инвентарные позиции найдены', type: [InventoryItemDto] })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по названию или описанию' })
  @ApiQuery({ name: 'includeInactive', required: false, description: 'Включать неактивные позиции', type: Boolean })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Фильтр по категории' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Фильтр по складу' })
  async getInventoryItemsByNetwork(
    @Param('networkId') networkId: string,
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: boolean,
    @Query('categoryId') categoryId?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.warehouseService.getInventoryItemsByNetwork(networkId, {
      search,
      includeInactive: includeInactive === true,
      categoryId,
      warehouseId,
    });
  }

  @Get('items/without-network')
  @ApiOperation({ summary: 'Получить инвентарные позиции без сети' })
  @ApiResponse({ status: 200, description: 'Инвентарные позиции найдены', type: [InventoryItemDto] })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по названию или описанию' })
  @ApiQuery({ name: 'includeInactive', required: false, description: 'Включать неактивные позиции', type: Boolean })
  async getInventoryItemsWithoutNetwork(
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.warehouseService.getInventoryItemsWithoutNetwork();
  }


  @Get('network/:networkId/category/:categoryId/items')
  @ApiOperation({ summary: 'Get inventory items by network and category' })
  @ApiResponse({ status: 200, description: 'Inventory items found', type: [InventoryItemDto] })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or description' })
  @ApiQuery({ name: 'includeInactive', required: false, description: 'Include inactive items', type: Boolean })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Filter by warehouse' })
  async getInventoryItemsByNetworkAndCategory(
    @Param('networkId') networkId: string,
    @Param('categoryId') categoryId: string,
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: boolean,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.warehouseService.getInventoryItemsByNetwork(networkId, {
      search,
      includeInactive: includeInactive === true,
      categoryId,
      warehouseId,
    });
  }
  @Get('network/:networkId/storage-locations')
  @ApiOperation({ summary: 'Получить места хранения по сети' })
  @ApiResponse({ status: 200, description: 'Места хранения найдены', type: [StorageLocationDto] })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по названию или коду' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Фильтр по складу' })
  async getStorageLocationsByNetwork(
    @Param('networkId') networkId: string,
    @Query('search') search?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.warehouseService.getStorageLocationsByNetwork(networkId, {
      search,
      warehouseId,
    });
  }

  @Get('network/:networkId/categories')
  @ApiOperation({ summary: 'Получить категории инвентаря по сети' })
  @ApiResponse({ status: 200, description: 'Категории найдены', type: [InventoryCategoryDto] })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiQuery({ name: 'parentId', required: false })
  async getInventoryCategoriesByNetwork(
    @Param('networkId') networkId: string,
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: boolean,
    @Query('parentId') parentId?: string,
  ) {
    return this.warehouseService.getInventoryCategoriesByNetwork(networkId, {
      search,
      parentId: parentId === 'null' ? null : parentId,
    });
  }

  @Get('network/:networkId/categories/tree')
  @ApiOperation({ summary: 'Получить дерево категорий по сети' })
  @ApiResponse({ status: 200, description: 'Дерево категорий найдено', type: [InventoryCategoryDto] })
  async getCategoryTreeByNetwork(@Param('networkId') networkId: string) {
    return this.warehouseService.getCategoryTreeByNetwork(networkId);
  }

  @Get('network/:networkId/premixes')
  @ApiOperation({ summary: 'Получить премиксы по сети' })
  @ApiResponse({ status: 200, description: 'Премиксы найдены', type: [PremixDto] })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по названию премикса' })
  async getPremixesByNetwork(
    @Param('networkId') networkId: string,
    @Query('search') search?: string,
  ) {
    return this.warehouseService.getPremixesByNetwork(networkId, { search });
  }

}

