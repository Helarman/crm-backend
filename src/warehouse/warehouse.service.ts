import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InventoryTransactionType, Prisma } from '@prisma/client';
import { AddMissingItemsDto, BulkCreateWarehouseItemsDto, CreateInventoryTransactionDto, CreateWarehouseDto, CreateWarehouseItemDto } from './dto/warehouse.dto';

@Injectable()
export class WarehouseService {
  constructor(private prisma: PrismaService) {}
  private readonly logger = new Logger(WarehouseService.name);
  // ==================== Warehouse Methods ====================

 async createWarehouse(data: CreateWarehouseDto) {
  return this.prisma.$transaction(async (prisma) => {
    const warehouse = await prisma.warehouse.create({
      data: {
        name: data.name,
        description: data.description,
        restaurant: {
          connect: { id: data.restaurantId }
        }
      }
    });

    // Добавляем initial inventory если указано
    if (data.initialInventory && data.initialInventory.length > 0) {
      for (const item of data.initialInventory) {
        await prisma.warehouseItem.create({
          data: {
            warehouse: { connect: { id: warehouse.id } },
            inventoryItem: { connect: { id: item.inventoryItemId } },
            quantity: item.quantity || 0,
            minQuantity: item.minQuantity,
            storageLocation: item.storageLocationId ? {
              connect: { id: item.storageLocationId }
            } : undefined
          }
        });
      }
    }

    return this.getWarehouseById(warehouse.id);
  });
}

async addExistingItemsToWarehouse(warehouseId: string, items: {
  inventoryItemId: string;
  quantity?: number;
  minQuantity?: number;
  storageLocationId?: string;
}[]) {
  return this.prisma.$transaction(async (prisma) => {
    const results = [];
    
    for (const item of items) {
      // Проверяем, не существует ли уже такая запись
      const existing = await prisma.warehouseItem.findUnique({
        where: {
          warehouseId_inventoryItemId: {
            warehouseId,
            inventoryItemId: item.inventoryItemId
          }
        }
      });

      if (existing) {
        throw new Error(`Item ${item.inventoryItemId} already exists in warehouse`);
      }

      const warehouseItem = await prisma.warehouseItem.create({
        data: {
          warehouse: { connect: { id: warehouseId } },
          inventoryItem: { connect: { id: item.inventoryItemId } },
          quantity: item.quantity || 0,
          minQuantity: item.minQuantity,
          storageLocation: item.storageLocationId ? {
            connect: { id: item.storageLocationId }
          } : undefined
        },
        include: {
          inventoryItem: true,
          storageLocation: true
        }
      });

      results.push(warehouseItem);
    }

    return results;
  });
}

  async getWarehouseById(id: string) {
    return this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        storageLocations: true,
        warehouseItems: {
          include: {
            inventoryItem: true,
            storageLocation: true,
          },
        },
        restaurant: true,
      },
    });
  }

  async getRestaurantWarehouse(restaurantId: string) {
    return this.prisma.warehouse.findUnique({
      where: { restaurantId },
      include: {
        storageLocations: true,
        warehouseItems: {
          include: {
            inventoryItem: {
              include: {
                product: true,
                premix: true,
              },
            },
            storageLocation: true,
          },
        },
        restaurant: true,
      },
    });
  }

  async updateWarehouse(id: string, data: Prisma.WarehouseUpdateInput) {
    return this.prisma.warehouse.update({
      where: { id },
      data,
    });
  }

  async deleteWarehouse(id: string) {
    // Check if warehouse has items
    const itemsCount = await this.prisma.warehouseItem.count({
      where: { warehouseId: id },
    });

    if (itemsCount > 0) {
      throw new Error('Cannot delete warehouse with items');
    }

    return this.prisma.warehouse.delete({
      where: { id },
    });
  }

  // ==================== Storage Location Methods ====================

  async createStorageLocation(data: Prisma.StorageLocationCreateInput) {
    return this.prisma.storageLocation.create({
      data,
    });
  }

  async getStorageLocationById(id: string) {
    return this.prisma.storageLocation.findUnique({
      where: { id },
      include: {
        warehouse: true,
        WarehouseItem: true,
      },
    });
  }

  async updateStorageLocation(id: string, data: Prisma.StorageLocationUpdateInput) {
    return this.prisma.storageLocation.update({
      where: { id },
      data,
    });
  }

  async deleteStorageLocation(id: string) {
    // Check if location has items
    const itemsCount = await this.prisma.warehouseItem.count({
      where: { storageLocationId: id },
    });

    if (itemsCount > 0) {
      throw new Error('Cannot delete storage location with items');
    }

    return this.prisma.storageLocation.delete({
      where: { id },
    });
  }

  // ==================== Inventory Item Methods ====================

  async createInventoryItem(data: Prisma.InventoryItemCreateInput & {
  addToWarehouseId?: string;
  initialQuantity?: number;
}) {
  const { addToWarehouseId, initialQuantity, ...inventoryData } = data;
  
  return this.prisma.$transaction(async (prisma) => {
    const inventoryItem = await prisma.inventoryItem.create({
      data: inventoryData
    });

    // Автоматически добавляем на склад если указано
    if (addToWarehouseId) {
      await prisma.warehouseItem.create({
        data: {
          warehouse: { connect: { id: addToWarehouseId } },
          inventoryItem: { connect: { id: inventoryItem.id } },
          quantity: initialQuantity || 0
        }
      });
    }

    return this.getInventoryItemById(inventoryItem.id);
  });
}

async getWarehouseCoverage(warehouseId: string) {
  const totalItems = await this.prisma.inventoryItem.count({
    where: { isActive: true }
  });

  const itemsInWarehouse = await this.prisma.warehouseItem.count({
    where: { warehouseId }
  });

  const missingItems = await this.prisma.inventoryItem.findMany({
    where: {
      isActive: true,
      warehouseItems: {
        none: {
          warehouseId: warehouseId
        }
      }
    },
    select: {
      id: true,
      name: true,
      unit: true
    },
    orderBy: { name: 'asc' }
  });

  return {
    totalActiveItems: totalItems,
    itemsInWarehouse: itemsInWarehouse,
    coveragePercentage: totalItems > 0 ? Math.round((itemsInWarehouse / totalItems) * 100) : 0,
    missingItems: missingItems,
    missingCount: missingItems.length
  };
}

async addMissingItemsToWarehouse(data: AddMissingItemsDto) {
  // Сначала получаем список missing items вне транзакции
  const missingItems = await this.prisma.inventoryItem.findMany({
    where: {
      isActive: true,
      warehouseItems: {
        none: {
          warehouseId: data.warehouseId
        }
      }
    },
    select: {
      id: true,
      name: true,
      unit: true
    },
    orderBy: { name: 'asc' }
  });

  if (missingItems.length === 0) {
    return {
      status: 'success',
      message: 'No missing items found for this warehouse',
      totalMissing: 0,
      added: 0,
      errors: 0,
      details: []
    };
  }

  const results = {
    totalMissing: missingItems.length,
    added: 0,
    errors: 0,
    details: [] as Array<{
      inventoryItemId: string;
      inventoryItemName: string;
      status: 'added' | 'error';
      error?: string;
    }>
  };

  // Обрабатываем каждый товар отдельно, без общей транзакции
  for (const item of missingItems) {
    try {
      // Используем отдельную транзакцию для каждого товара
      await this.prisma.$transaction(async (prisma) => {
        await prisma.warehouseItem.create({
          data: {
            warehouse: { connect: { id: data.warehouseId } },
            inventoryItem: { connect: { id: item.id } },
            quantity: data.defaultQuantity || 0,
            minQuantity: data.defaultMinQuantity,
            storageLocation: data.defaultStorageLocationId ? {
              connect: { id: data.defaultStorageLocationId }
            } : undefined
          }
        });
      });

      results.added++;
      results.details.push({
        inventoryItemId: item.id,
        inventoryItemName: item.name,
        status: 'added'
      });

    } catch (error) {
      results.errors++;
      results.details.push({
        inventoryItemId: item.id,
        inventoryItemName: item.name,
        status: 'error',
        error: error.message
      });

      // Если не игнорировать ошибки - прерываем выполнение
      if (!data.ignoreErrors) {
        throw error;
      }
    }
  }

  return {
    status: results.errors > 0 ? 'partial' : 'success',
    message: `Added ${results.added} of ${results.totalMissing} missing items`,
    ...results
  };
}

async bulkCreateWarehouseItemsForRestaurant(data: BulkCreateWarehouseItemsDto) {
  return this.prisma.$transaction(async (prisma) => {
    // Получаем или находим склад ресторана
    let warehouseId = data.warehouseId;
    if (!warehouseId) {
      const restaurantWarehouse = await prisma.warehouse.findUnique({
        where: { restaurantId: data.restaurantId }
      });
      
      if (!restaurantWarehouse) {
        throw new Error(`No warehouse found for restaurant ${data.restaurantId}`);
      }
      warehouseId = restaurantWarehouse.id;
    }

    // Получаем все активные inventory items
    const whereCondition: Prisma.InventoryItemWhereInput = {
      isActive: true
    };

    // Если указаны конкретные ID, фильтруем по ним
    if (data.specificItemIds && data.specificItemIds.length > 0) {
      whereCondition.id = { in: data.specificItemIds };
    }

    const inventoryItems = await prisma.inventoryItem.findMany({
      where: whereCondition,
      select: { id: true, name: true }
    });

    if (inventoryItems.length === 0) {
      throw new Error('No active inventory items found');
    }

    const results = {
      totalItems: inventoryItems.length,
      created: 0,
      skipped: 0,
      errors: 0,
      details: [] as Array<{
        inventoryItemId: string;
        inventoryItemName: string;
        status: 'created' | 'skipped' | 'error';
        error?: string;
      }>
    };

    // Создаем warehouse items для каждого inventory item
    for (const item of inventoryItems) {
      try {
        // Проверяем, существует ли уже запись
        const existing = await prisma.warehouseItem.findUnique({
          where: {
            warehouseId_inventoryItemId: {
              warehouseId,
              inventoryItemId: item.id
            }
          }
        });

        if (existing) {
          if (data.skipExisting) {
            results.skipped++;
            results.details.push({
              inventoryItemId: item.id,
              inventoryItemName: item.name,
              status: 'skipped',
              error: 'Already exists'
            });
            continue;
          } else {
            // Обновляем существующую запись
            await prisma.warehouseItem.update({
              where: { id: existing.id },
              data: {
                quantity: data.defaultQuantity !== undefined ? data.defaultQuantity : existing.quantity,
                minQuantity: data.defaultMinQuantity !== undefined ? data.defaultMinQuantity : existing.minQuantity,
                storageLocationId: data.defaultStorageLocationId || existing.storageLocationId
              }
            });
            results.created++;
            results.details.push({
              inventoryItemId: item.id,
              inventoryItemName: item.name,
              status: 'created',
              error: 'Updated existing'
            });
            continue;
          }
        }

        // Создаем новую запись
        await prisma.warehouseItem.create({
          data: {
            warehouse: { connect: { id: warehouseId } },
            inventoryItem: { connect: { id: item.id } },
            quantity: data.defaultQuantity || 0,
            minQuantity: data.defaultMinQuantity,
            storageLocation: data.defaultStorageLocationId ? {
              connect: { id: data.defaultStorageLocationId }
            } : undefined
          }
        });

        results.created++;
        results.details.push({
          inventoryItemId: item.id,
          inventoryItemName: item.name,
          status: 'created'
        });

      } catch (error) {
        results.errors++;
        results.details.push({
          inventoryItemId: item.id,
          inventoryItemName: item.name,
          status: 'error',
          error: error.message
        });
      }
    }

    return results;
  });
}

  async getInventoryItemById(id: string) {
    return this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        product: true,
        premix: true,
        warehouseItems: {
          include: {
            warehouse: true,
            storageLocation: true,
          },
        },
        ingredients: {
          include: {
            product: true,
          },
        },
        premixIgredients: {
          include: {
            premix: true,
          },
        },
      },
    });
  }

  async updateInventoryItem(id: string, data: Prisma.InventoryItemUpdateInput) {
    return this.prisma.inventoryItem.update({
      where: { id },
      data,
    });
  }

  async deleteInventoryItem(id: string) {
    // Soft delete
    return this.prisma.inventoryItem.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ==================== Warehouse Item Methods ====================

  async createWarehouseItem(data: CreateWarehouseItemDto) {
    return this.prisma.warehouseItem.create({
      data: {
        quantity: data.quantity,
        minQuantity: data.minQuantity,
        warehouse: {
          connect: { id: data.warehouseId }
        },
        inventoryItem: {
          connect: { id: data.inventoryItemId } 
        },
        storageLocation: data.storageLocationId ? {
          connect: { id: data.storageLocationId }
        } : undefined
      }
    });
  }
  
  async getWarehouseItemById(id: string) {
    return this.prisma.warehouseItem.findUnique({
      where: { id },
      include: {
        inventoryItem: true,
        warehouse: true,
        storageLocation: true,
      },
    });
  }

  async updateWarehouseItem(id: string, data: Prisma.WarehouseItemUpdateInput) {
    return this.prisma.warehouseItem.update({
      where: { id },
      data,
    });
  }

  async deleteWarehouseItem(id: string) {
    return this.prisma.warehouseItem.delete({
      where: { id },
    });
  }

  // ==================== Inventory Transaction Methods ====================

 async createTransaction(data: {
  inventoryItemId: string;
  warehouseId: string;
  warehouseItemId?: string;
  targetWarehouseId?: string; // Для трансферов
  type: InventoryTransactionType;
  quantity: number;
  userId?: string;
  reason?: string;
  documentId?: string;
}) {
  return this.prisma.$transaction(async (prisma) => {
    // Валидация для трансферов
    if (data.type === 'TRANSFER' && !data.targetWarehouseId) {
      throw new Error('Target warehouse is required for transfers');
    }

    if (data.type === 'TRANSFER' && data.warehouseId === data.targetWarehouseId) {
      throw new Error('Cannot transfer to the same warehouse');
    }

    // 1. Находим или создаем warehouse item
    let warehouseItem: any;
    
    if (data.warehouseItemId) {
      warehouseItem = await prisma.warehouseItem.findUnique({
        where: { id: data.warehouseItemId },
        select: {
          id: true,
          quantity: true,
          reserved: true,
          warehouseId: true,
          inventoryItemId: true
        }
      });

      if (!warehouseItem) {
        throw new Error('Warehouse item not found');
      }

      if (warehouseItem.inventoryItemId !== data.inventoryItemId) {
        throw new Error('Warehouse item does not match inventory item');
      }
    } else {
      warehouseItem = await prisma.warehouseItem.findFirst({
        where: {
          inventoryItemId: data.inventoryItemId,
          warehouseId: data.warehouseId
        },
        select: {
          id: true,
          quantity: true,
          reserved: true,
          warehouseId: true,
          inventoryItemId: true
        }
      });

      if (!warehouseItem) {
        warehouseItem = await prisma.warehouseItem.create({
          data: {
            warehouse: { connect: { id: data.warehouseId } },
            inventoryItem: { connect: { id: data.inventoryItemId } },
            quantity: 0
          },
          select: {
            id: true,
            quantity: true,
            reserved: true,
            warehouseId: true,
            inventoryItemId: true
          }
        });
      }
    }

    // 2. Рассчитываем новое количество
    let newQuantity: number;
    let targetWarehouseItem: any = null;

    switch (data.type) {
      case 'RECEIPT':
        newQuantity = warehouseItem.quantity + data.quantity;
        break;
      case 'WRITE_OFF':
        newQuantity = warehouseItem.quantity - data.quantity;
        if (newQuantity < 0) {
          throw new Error('Insufficient quantity for write-off');
        }
        break;
      case 'CORRECTION':
        newQuantity = data.quantity;
        break;
      case 'TRANSFER':
        newQuantity = warehouseItem.quantity - data.quantity;
        if (newQuantity < 0) {
          throw new Error('Insufficient quantity for transfer');
        }
        
        // Находим или создаем warehouse item на целевом складе
        targetWarehouseItem = await prisma.warehouseItem.findFirst({
          where: {
            inventoryItemId: data.inventoryItemId,
            warehouseId: data.targetWarehouseId
          },
          select: {
            id: true,
            quantity: true
          }
        });

        if (!targetWarehouseItem) {
          targetWarehouseItem = await prisma.warehouseItem.create({
            data: {
              warehouse: { connect: { id: data.targetWarehouseId! } },
              inventoryItem: { connect: { id: data.inventoryItemId } },
              quantity: 0
            },
            select: {
              id: true,
              quantity: true
            }
          });
        }
        break;
      default:
        throw new Error('Invalid transaction type');
    }

    // 3. Создаем транзакцию
    const transaction = await prisma.inventoryTransaction.create({
      data: {
        type: data.type,
        quantity: data.quantity,
        previousQuantity: warehouseItem.quantity,
        newQuantity,
        reason: data.reason,
        documentId: data.documentId,
        inventoryItem: {
          connect: { id: data.inventoryItemId }
        },
        warehouseItem: {
          connect: { id: warehouseItem.id }
        },
        warehouse: {
          connect: { id: data.warehouseId }
        },
        targetWarehouse: data.targetWarehouseId ? {
          connect: { id: data.targetWarehouseId }
        } : undefined,
        user: data.userId ? {
          connect: { id: data.userId }
        } : undefined
      }
    });

    // 4. Обновляем количество
    if (data.type !== 'TRANSFER') {
      await prisma.warehouseItem.update({
        where: { id: warehouseItem.id },
        data: { quantity: newQuantity }
      });
    } else {
      // Для трансферов обновляем оба склада
      await prisma.warehouseItem.update({
        where: { id: warehouseItem.id },
        data: { quantity: newQuantity }
      });

      await prisma.warehouseItem.update({
        where: { id: targetWarehouseItem.id },
        data: { quantity: targetWarehouseItem.quantity + data.quantity }
      });
    }

    return transaction;
  });
}



async getInventoryTransactionById(id: string) {
  return this.prisma.inventoryTransaction.findUnique({
    where: { id },
    include: {
      inventoryItem: true,
      warehouseItem: {
        include: {
          warehouse: true,
          storageLocation: true,
        },
      },
      warehouse: true,
      targetWarehouse: true,
      user: true,
    },
  });
}

async getInventoryTransactionsByItem(itemId: string) {
  return this.prisma.inventoryTransaction.findMany({
    where: { inventoryItemId: itemId },
    orderBy: { createdAt: 'desc' },
    include: {
      inventoryItem: true,
      warehouseItem: {
        include: {
          warehouse: true,
        },
      },
      warehouse: true,
      targetWarehouse: true,
      user: true,
    },
  });
}

async getWarehouseTransactions(warehouseId: string, filters: {
  startDate?: Date;
  endDate?: Date;
  type?: InventoryTransactionType;
  includeTransfers?: boolean;
} = {}) {
  const where: Prisma.InventoryTransactionWhereInput = {
    OR: [
      { warehouseId },
      ...(filters.includeTransfers ? [{ targetWarehouseId: warehouseId }] : [])
    ]
  };

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = filters.startDate;
    if (filters.endDate) where.createdAt.lte = filters.endDate;
  }

  if (filters.type) {
    where.type = filters.type;
  }

  return this.prisma.inventoryTransaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      inventoryItem: true,
      warehouseItem: {
        include: {
          storageLocation: true,
        },
      },
      warehouse: true,
      targetWarehouse: true,
      user: true,
    },
  });
}

// Новый метод для получения трансферов между складами
async getTransferTransactions(warehouseId: string, filters: {
  startDate?: Date;
  endDate?: Date;
  direction?: 'incoming' | 'outgoing' | 'both';
} = {}) {
  const where: Prisma.InventoryTransactionWhereInput = {
    type: 'TRANSFER'
  };

  if (filters.direction === 'incoming' || filters.direction === 'both') {
    where.OR = [
      ...(where.OR || []),
      { targetWarehouseId: warehouseId }
    ];
  }

  if (filters.direction === 'outgoing' || filters.direction === 'both') {
    where.OR = [
      ...(where.OR || []),
      { warehouseId }
    ];
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = filters.startDate;
    if (filters.endDate) where.createdAt.lte = filters.endDate;
  }

  return this.prisma.inventoryTransaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      inventoryItem: true,
      warehouseItem: true,
      warehouse: true,
      targetWarehouse: true,
      user: true,
    },
  });
}

  // ==================== Premix Methods ====================

  async createPremix(data: Prisma.PremixCreateInput) {
    return this.prisma.$transaction(async (prisma) => {
      // Create inventory item first
      const inventoryItem = await prisma.inventoryItem.create({
        data: {
          name: data.name as string,
          description: data.description as string,
          unit: data.unit as string,
          isActive: true,
          premix: {
            connect: { id: (data as any).id }, 
          },
        },
      });

      // Then create premix with ingredients
      const premix = await prisma.premix.create({
        data: {
          ...data,
          inventoryItem: {
            connect: { id: inventoryItem.id },
          },
        },
        include: {
          ingredients: {
            include: {
              inventoryItem: true,
            },
          },
          inventoryItem: true,
        },
      });

      return premix;
    });
  }

  async getPremixById(id: string) {
    return this.prisma.premix.findUnique({
      where: { id },
      include: {
        ingredients: {
          include: {
            inventoryItem: true,
          },
        },
        inventoryItem: {
          include: {
            warehouseItems: {
              include: {
                warehouse: true,
                storageLocation: true,
              },
            },
          },
        },
      },
    });
  }

  async updatePremix(id: string, data: Prisma.PremixUpdateInput) {
    return this.prisma.$transaction(async (prisma) => {
      const premix = await prisma.premix.update({
        where: { id },
        data: {
          ...data,
        },
        include: {
          inventoryItem: true,
        },
      });

      if (data.name || data.description || data.unit) {
        await prisma.inventoryItem.update({
          where: { premixId: id },
          data: {
            name: data.name as string,
            description: data.description as string,
            unit: data.unit as string,
          },
        });
      }

      return premix;
    });
  }

  async deletePremix(id: string) {
    return this.prisma.$transaction(async (prisma) => {
      // First delete the premix ingredients
      await prisma.premixIngredient.deleteMany({
        where: { premixId: id },
      });

      // Then delete the premix
      await prisma.premix.delete({
        where: { id },
      });

      // Finally delete the connected inventory item
      await prisma.inventoryItem.delete({
        where: { premixId: id },
      });
    });
  }

  async preparePremix(premixId: string, quantity: number, userId?: string) {
    return this.prisma.$transaction(async (prisma) => {
      const premix = await prisma.premix.findUnique({
        where: { id: premixId },
        include: {
          ingredients: {
            include: {
              inventoryItem: {
                include: {
                  warehouseItems: true,
                },
              },
            },
          },
          inventoryItem: {
            include: {
              warehouseItems: true 
            }
          }
        },
      });

      if (!premix) {
        throw new Error('Premix not found');
      }

      // Check ingredient availability
      for (const ingredient of premix.ingredients) {
        const totalAvailable = ingredient.inventoryItem.warehouseItems.reduce(
          (sum, wi) => sum + wi.quantity - wi.reserved,
          0,
        );

        const required = ingredient.quantity * quantity;

        if (totalAvailable < required) {
          throw new Error(
            `Not enough ${ingredient.inventoryItem.name}. Required: ${required}, Available: ${totalAvailable}`,
          );
        }
      }

      // Deduct ingredients
      for (const ingredient of premix.ingredients) {
        const required = ingredient.quantity * quantity;
        let remaining = required;

        // Deduct from warehouse items (FIFO)
        const warehouseItems = await prisma.warehouseItem.findMany({
          where: {
            inventoryItemId: ingredient.inventoryItem.id,
            quantity: { gt: 0 },
          },
          orderBy: { createdAt: 'asc' },
        });

        for (const warehouseItem of warehouseItems) {
          if (remaining <= 0) break;

          const deduct = Math.min(remaining, warehouseItem.quantity);
          remaining -= deduct;

          await prisma.warehouseItem.update({
            where: { id: warehouseItem.id },
            data: { quantity: { decrement: deduct } },
          });

          await prisma.inventoryTransaction.create({
            data: {
              type: 'WRITE_OFF',
              quantity: deduct,
              previousQuantity: warehouseItem.quantity,
              newQuantity: warehouseItem.quantity - deduct,
              reason: `Premix preparation: ${premix.name}`,
              inventoryItem: { connect: { id: ingredient.inventoryItem.id } },
              user: userId ? { connect: { id: userId } } : undefined,
              documentId: premixId,
            },
          });
        }
      }

      const resultingQuantity = quantity * (premix.yield || 1);
      const warehouseItem = premix.inventoryItem.warehouseItems[0];

      if (!warehouseItem) {
        throw new Error('No warehouse assigned for this premix');
      }

      const updatedItem = await prisma.warehouseItem.update({
        where: { id: warehouseItem.id },
        data: { quantity: { increment: resultingQuantity } },
      });

      await prisma.inventoryTransaction.create({
        data: {
          type: 'RECEIPT',
          quantity: resultingQuantity,
          previousQuantity: warehouseItem.quantity,
          newQuantity: warehouseItem.quantity + resultingQuantity,
          reason: `Premix preparation: ${premix.name}`,
          inventoryItem: { connect: { id: premix.inventoryItem.id } },
          user: userId ? { connect: { id: userId } } : undefined,
          documentId: premixId,
        },
      });

      return updatedItem;
    });
  }

  // ==================== Premix Ingredient Methods ====================

  async addPremixIngredient(premixId: string, inventoryItemId: string, quantity: number) {
    return this.prisma.premixIngredient.create({
      data: {
        premix: { connect: { id: premixId } },
        inventoryItem: { connect: { id: inventoryItemId } },
        quantity,
      },
    });
  }

  async updatePremixIngredient(premixId: string, inventoryItemId: string, quantity: number) {
    return this.prisma.premixIngredient.update({
      where: {
        premixId_inventoryItemId: {
          premixId,
          inventoryItemId,
        },
      },
      data: { quantity },
    });
  }

  async removePremixIngredient(premixId: string, inventoryItemId: string) {
    return this.prisma.premixIngredient.delete({
      where: {
        premixId_inventoryItemId: {
          premixId,
          inventoryItemId,
        },
      },
    });
  }

  // ==================== Product Ingredient Methods ====================

  async addProductIngredient(productId: string, inventoryItemId: string, quantity: number) {
    return this.prisma.productIngredient.create({
      data: {
        product: { connect: { id: productId } },
        inventoryItem: { connect: { id: inventoryItemId } },
        quantity,
      },
    });
  }

  async updateProductIngredient(productId: string, inventoryItemId: string, quantity: number) {
    return this.prisma.productIngredient.update({
      where: {
        productId_inventoryItemId: {
          productId,
          inventoryItemId,
        },
      },
      data: { quantity },
    });
  }

  async removeProductIngredient(productId: string, inventoryItemId: string) {
    return this.prisma.productIngredient.delete({
      where: {
        productId_inventoryItemId: {
          productId,
          inventoryItemId,
        },
      },
    });
  }

  async checkProductIngredientsAvailability(productId: string, quantity: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        ingredients: {
          include: {
            inventoryItem: {
              include: {
                warehouseItems: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const availability = [];
    let allAvailable = true;

    for (const ingredient of product.ingredients) {
      const totalAvailable = ingredient.inventoryItem.warehouseItems.reduce(
        (sum, wi) => sum + wi.quantity - wi.reserved,
        0,
      );

      const required = ingredient.quantity * quantity;
      const isAvailable = totalAvailable >= required;

      availability.push({
        ingredientId: ingredient.inventoryItem.id,
        ingredientName: ingredient.inventoryItem.name,
        required,
        available: totalAvailable,
        isAvailable,
      });

      if (!isAvailable) {
        allAvailable = false;
      }
    }

    return {
      productId,
      productName: product.title,
      quantity,
      allAvailable,
      ingredients: availability,
    };
  }

async getWarehouseItemsWithDetails(warehouseId: string, filters: {
  search?: string;
  lowStock?: boolean;
  storageLocationId?: string;
} = {}) {
  const where: Prisma.WarehouseItemWhereInput = {
    warehouseId,
  };

  // Фильтр по местоположению
  if (filters.storageLocationId) {
    where.storageLocationId = filters.storageLocationId;
  }

  // Поиск по названию товара
  if (filters.search) {
    where.inventoryItem = {
      name: {
        contains: filters.search,
        mode: 'insensitive',
      },
    };
  }

  return this.prisma.warehouseItem.findMany({
    where,
    include: {
      inventoryItem: {
        include: {
          product: true,
          premix: true,
          ingredients: {
            include: {
              product: true,
            },
          },
          premixIgredients: {
            include: {
              premix: true,
            },
          },
        },
      },
      warehouse: true,
      storageLocation: true,
    },
    orderBy: {
      inventoryItem: {
        name: 'asc',
      },
    },
  });
}
  async getItemsNotInWarehouse(warehouseId: string) {
  return this.prisma.inventoryItem.findMany({
    where: {
      isActive: true,
      warehouseItems: {
        none: {
          warehouseId: warehouseId
        }
      }
    },
    include: {
      product: true,
      premix: true
    },
    orderBy: { name: 'asc' }
  });
}

// ==================== Storage Location List Method ====================
  async listStorageLocations(warehouseId: string, filters: {
    search?: string;
  } = {}) {
    const where: Prisma.StorageLocationWhereInput = {
      warehouseId,
    };

    if (filters.search) {
      where.OR = [
        {
          name: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          code: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    return this.prisma.storageLocation.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

// ==================== Premix List Method ====================
  async listPremixes(filters: {
    search?: string;
  } = {}) {
    const where: Prisma.PremixWhereInput = {};

    if (filters.search) {
      where.name = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    return this.prisma.premix.findMany({
      where,
      include: {
        ingredients: {
          include: {
            inventoryItem: true,
          },
        },
        inventoryItem: true,
      },
      orderBy: { name: 'asc' },
    });


  }

  async getPremixesWithWarehouseItems(warehouseId: string, filters: {
  search?: string;
} = {}) {
  const where: Prisma.PremixWhereInput = {};

  if (filters.search) {
    where.name = {
      contains: filters.search,
      mode: 'insensitive',
    };
  }

  return this.prisma.premix.findMany({
    where,
    include: {
      ingredients: {
        include: {
          inventoryItem: {
            include: {
              warehouseItems: {
                where: {
                  warehouseId: warehouseId
                },
                include: {
                  warehouse: true,
                  storageLocation: true,
                }
              }
            }
          },
        },
      },
      inventoryItem: {
        include: {
          warehouseItems: {
            where: {
              warehouseId: warehouseId
            },
            include: {
              warehouse: true,
              storageLocation: true,
            }
          }
        }
      },
    },
    orderBy: { name: 'asc' },
  });
}
async getPremixWithWarehouseInfo(premixId: string, warehouseId: string) {
  const premix = await this.prisma.premix.findUnique({
    where: { id: premixId },
    include: {
      ingredients: {
        include: {
          inventoryItem: {
            include: {
              warehouseItems: {
                where: {
                  warehouseId: warehouseId
                },
                include: {
                  warehouse: true,
                  storageLocation: true,
                }
              }
            }
          },
        },
      },
      inventoryItem: {
        include: {
          warehouseItems: {
            where: {
              warehouseId: warehouseId
            },
            include: {
              warehouse: true,
              storageLocation: true,
            }
          }
        }
      },
    },
  });

  if (!premix) {
    throw new Error('Premix not found');
  }

  return {
    ...premix,
    warehouseItem: premix.inventoryItem?.warehouseItems[0] || null,
    availableQuantity: premix.inventoryItem?.warehouseItems[0] 
      ? premix.inventoryItem.warehouseItems[0].quantity - premix.inventoryItem.warehouseItems[0].reserved 
      : 0
  };
}
async getPremixWithWarehouseDetails(premixId: string, warehouseId: string) {
  return this.prisma.premix.findUnique({
    where: { id: premixId },
    include: {
      ingredients: {
        include: {
          inventoryItem: {
            include: {
              warehouseItems: {
                where: {
                  warehouseId: warehouseId
                },
                include: {
                  warehouse: true,
                  storageLocation: true,
                }
              }
            }
          },
        },
      },
      inventoryItem: {
        include: {
          warehouseItems: {
            where: {
              warehouseId: warehouseId
            },
            include: {
              warehouse: true,
              storageLocation: true,
            }
          }
        }
      },
    },
  });
}

async getPremixTransactions(premixId: string, warehouseId: string) {
  const premix = await this.prisma.premix.findUnique({
    where: { id: premixId },
    include: {
      inventoryItem: true
    }
  });

  if (!premix || !premix.inventoryItem) {
    return [];
  }

  // Находим warehouseItem для этого премикса в данном складе
  const warehouseItem = await this.prisma.warehouseItem.findFirst({
    where: {
      warehouseId: warehouseId,
      inventoryItemId: premix.inventoryItem.id
    }
  });

  if (!warehouseItem) {
    return [];
  }

  // Получаем транзакции для этого warehouseItem
  return this.prisma.inventoryTransaction.findMany({
    where: {
      warehouseItemId: warehouseItem.id
    },
    orderBy: { createdAt: 'desc' },
    include: {
      inventoryItem: true,
      warehouseItem: {
        include: {
          warehouse: true,
          storageLocation: true,
        },
      },
      warehouse: true,
      targetWarehouse: true,
      user: true,
    },
  });
}
}