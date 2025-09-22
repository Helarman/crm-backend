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
    initialQuantity?: number;
    categoryId?: string;
  }) {
    const { initialQuantity, categoryId, ...inventoryData } = data;
    
    return this.prisma.$transaction(async (prisma) => {
      // Проверяем существование имени
      const existingItem = await prisma.inventoryItem.findUnique({
        where: { name: inventoryData.name }
      });

      if (existingItem) {
        throw new Error('Inventory item with this name already exists');
      }

      // Создаем inventory item
      const inventoryItem = await prisma.inventoryItem.create({
        data: {
          ...inventoryData,
          category: categoryId ? {
            connect: { id: categoryId }
          } : undefined
        }
      });

      // Получаем все активные склады
      const allWarehouses = await prisma.warehouse.findMany({
        where: { isActive: true }
      });

      // Используем Promise.all для параллельного создания
      await Promise.all(allWarehouses.map(async (warehouse) => {
        console.log("Creating for warehouse:", warehouse.id, "with item:", inventoryItem.id);
        
        await prisma.warehouseItem.create({
          data: {
            warehouse: { connect: { id: warehouse.id } },
            inventoryItem: { connect: { id: inventoryItem.id } },
            quantity: initialQuantity || 0,
            minQuantity: 0
          }
        });
      }));

      return inventoryItem;
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

async getAllInventoryItems() {
   const result = await this.prisma.inventoryItem.findMany();
    return result;
}

  async getInventoryItemById(id: string) {
    return this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        category:true,
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

  async getInventoryItemsByCategory(categoryId: string, filters: {
    includeInactive?: boolean;
    warehouseId?: string;
  } = {}) {
    const where: Prisma.InventoryItemWhereInput = {
      categoryId,
    };

    if (!filters.includeInactive) {
      where.isActive = true;
    }

    const items = await this.prisma.inventoryItem.findMany({
      where,
      include: {
        category: true,
        product: true,
        premix: true,
        warehouseItems: {
          where: filters.warehouseId ? {
            warehouseId: filters.warehouseId
          } : undefined,
          include: {
            warehouse: true,
            storageLocation: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return items;
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
  targetWarehouseId?: string;
  type: InventoryTransactionType;
  quantity: number;
  unitCost?: number;
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
          cost: true,
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

    // 2. Рассчитываем новое количество (УБИРАЕМ ПРОВЕРКИ НА ОТРИЦАТЕЛЬНЫЕ ЗНАЧЕНИЯ)
    let newQuantity: number;
    let newCost: number | null = warehouseItem.cost;
    let targetWarehouseItem: any = null;
    let totalCost = data.unitCost ? data.unitCost * data.quantity : null;

    switch (data.type) {
      case 'RECEIPT':
        newQuantity = warehouseItem.quantity + data.quantity;
        
        // Расчет средней взвешенной стоимости
        if (data.unitCost && warehouseItem.cost) {
          const currentTotalCost = warehouseItem.quantity * warehouseItem.cost;
          const newTotalCost = currentTotalCost + (data.quantity * data.unitCost);
          newCost = newTotalCost / newQuantity;
        } else if (data.unitCost) {
          // Первое поступление с указанной стоимостью
          newCost = data.unitCost;
        }
        break;
        
      case 'WRITE_OFF':
        newQuantity = warehouseItem.quantity - data.quantity;
        // Стоимость при списании остается прежней (FIFO/LIFO можно реализовать отдельно)
        break;
        
      case 'CORRECTION':
        newQuantity = data.quantity;
        if (data.unitCost) {
          newCost = data.unitCost;
        }
        break;
        
      case 'TRANSFER':
        newQuantity = warehouseItem.quantity - data.quantity;
        // Для трансферов стоимость остается прежней
        
        if (data.targetWarehouseId) {
          targetWarehouseItem = await prisma.warehouseItem.findFirst({
            where: {
              inventoryItemId: data.inventoryItemId,
              warehouseId: data.targetWarehouseId
            },
            select: {
              id: true,
              quantity: true,
              cost: true
            }
          });

          if (!targetWarehouseItem) {
            targetWarehouseItem = await prisma.warehouseItem.create({
              data: {
                warehouse: { connect: { id: data.targetWarehouseId! } },
                inventoryItem: { connect: { id: data.inventoryItemId } },
                quantity: 0,
                cost: warehouseItem.cost // Передаем текущую стоимость
              },
              select: {
                id: true,
                quantity: true,
                cost: true
              }
            });
          }
        }
        break;
    }
    // 3. Создаем транзакцию
    const transaction = await prisma.inventoryTransaction.create({
      data: {
        type: data.type,
        quantity: data.quantity,
        previousQuantity: warehouseItem.quantity,
        newQuantity,
        reason: data.reason,
        unitCost: data.unitCost,
        totalCost,
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

  // 4. Обновляем количество и стоимость
    const updateData: any = { quantity: newQuantity };
    if (newCost !== null && newCost !== undefined) {
      updateData.cost = newCost;
    }

    if (data.type !== 'TRANSFER') {
      await prisma.warehouseItem.update({
        where: { id: warehouseItem.id },
        data: updateData
      });
    } else if (data.targetWarehouseId && targetWarehouseItem) {
      // Для трансферов обновляем оба склада
      await prisma.warehouseItem.update({
        where: { id: warehouseItem.id },
        data: updateData
      });

      // Рассчитываем стоимость для целевого склада
      const targetUpdateData: any = {
        quantity: targetWarehouseItem.quantity + data.quantity
      };

      if (warehouseItem.cost) {
        const currentTargetTotalCost = targetWarehouseItem.quantity * (targetWarehouseItem.cost || 0);
        const transferTotalCost = data.quantity * warehouseItem.cost;
        const newTargetTotalCost = currentTargetTotalCost + transferTotalCost;
        const newTargetCost = newTargetTotalCost / (targetWarehouseItem.quantity + data.quantity);
        targetUpdateData.cost = newTargetCost;
      }

      await prisma.warehouseItem.update({
        where: { id: targetWarehouseItem.id },
        data: targetUpdateData
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

    // УБИРАЕМ ПРОВЕРКУ ДОСТУПНОСТИ ИНГРЕДИЕНТОВ
    // Теперь позволяем списывать даже если недостаточно ингредиентов

    // Deduct ingredients (даже если уходим в минус)
    for (const ingredient of premix.ingredients) {
      const required = ingredient.quantity * quantity;
      
      // Находим все warehouse items для этого ингредиента
      const warehouseItems = await prisma.warehouseItem.findMany({
        where: {
          inventoryItemId: ingredient.inventoryItem.id,
        },
        orderBy: { createdAt: 'asc' },
      });

      let remaining = required;

      // Сначала списываем из доступных позиций
      for (const warehouseItem of warehouseItems) {
        if (remaining <= 0) break;

        const available = warehouseItem.quantity;
        const deduct = Math.min(remaining, available);
        remaining -= deduct;

        if (deduct > 0) {
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
              warehouseItem: { connect: { id: warehouseItem.id } },
              warehouse: { connect: { id: warehouseItem.warehouseId } },
              user: userId ? { connect: { id: userId } } : undefined,
              documentId: premixId,
            },
          });
        }
      }

      // Если осталось списать - создаем отрицательный баланс
      if (remaining > 0) {
        // Находим основной склад или создаем запись с отрицательным количеством
        const mainWarehouseItem = warehouseItems[0] || await prisma.warehouseItem.create({
          data: {
            warehouse: { connect: { id: warehouseItems[0]?.warehouseId || (await prisma.warehouse.findFirst({ where: { isActive: true } }))?.id! } },
            inventoryItem: { connect: { id: ingredient.inventoryItem.id } },
            quantity: -remaining
          }
        });

        await prisma.warehouseItem.update({
          where: { id: mainWarehouseItem.id },
          data: { quantity: { decrement: remaining } },
        });

        await prisma.inventoryTransaction.create({
          data: {
            type: 'WRITE_OFF',
            quantity: remaining,
            previousQuantity: mainWarehouseItem.quantity,
            newQuantity: mainWarehouseItem.quantity - remaining,
            reason: `Premix preparation (negative balance): ${premix.name}`,
            inventoryItem: { connect: { id: ingredient.inventoryItem.id } },
            warehouseItem: { connect: { id: mainWarehouseItem.id } },
            warehouse: { connect: { id: mainWarehouseItem.warehouseId } },
            user: userId ? { connect: { id: userId } } : undefined,
            documentId: premixId,
          },
        });
      }
    }

    const resultingQuantity = quantity * (premix.yield || 1);
    let warehouseItem = premix.inventoryItem?.warehouseItems[0];

    // Если нет warehouse item - создаем его
    if (!warehouseItem) {
      const warehouse = await prisma.warehouse.findFirst({ where: { isActive: true } });
      if (!warehouse) {
        throw new Error('No active warehouse found');
      }

      warehouseItem = await prisma.warehouseItem.create({
        data: {
          warehouse: { connect: { id: warehouse.id } },
          inventoryItem: { connect: { id: premix.inventoryItem!.id } },
          quantity: 0
        }
      });
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
        inventoryItem: { connect: { id: premix.inventoryItem!.id } },
        warehouseItem: { connect: { id: warehouseItem.id } },
        warehouse: { connect: { id: warehouseItem.warehouseId } },
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
      (sum, wi) => sum + wi.quantity, // Убираем вычитание reserved
      0,
    );

    const required = ingredient.quantity * quantity;
    
    // Теперь просто показываем доступное количество, без проверки isAvailable
    availability.push({
      ingredientId: ingredient.inventoryItem.id,
      ingredientName: ingredient.inventoryItem.name,
      required,
      available: totalAvailable,
      // Всегда доступно, даже если отрицательное
    });
  }

  return {
    productId,
    productName: product.title,
    quantity,
    allAvailable: true, // Всегда true, так как разрешаем отрицательные значения
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

async createInventoryCategory(data: Prisma.InventoryCategoryCreateInput) {
  return this.prisma.inventoryCategory.create({
    data,
    include: {
      parent: true,
      children: true,
      inventoryItems: true,
    },
  });
}

async getInventoryCategoryById(id: string) {
  return this.prisma.inventoryCategory.findUnique({
    where: { id },
    include: {
      parent: true,
      children: true,
      inventoryItems: {
        include: {
          product: true,
          premix: true,
          warehouseItems: true,
        },
      },
    },
  });
}

async getAllInventoryCategories(filters: {
  search?: string;
  includeInactive?: boolean;
  parentId?: string | null;
} = {}) {
  const where: Prisma.InventoryCategoryWhereInput = {};

  if (filters.search) {
    where.name = {
      contains: filters.search,
      mode: 'insensitive',
    };
  }

  if (!filters.includeInactive) {
    where.isActive = true;
  }

  if (filters.parentId !== undefined) {
    where.parentId = filters.parentId;
  }
  return this.prisma.inventoryCategory.findMany({
    where,
    include: {
      parent: true,
      children: true,
      inventoryItems: {
        include: {
          product: true,
          premix: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });
}

async updateInventoryCategory(id: string, data: Prisma.InventoryCategoryUpdateInput) {
  return this.prisma.inventoryCategory.update({
    where: { id },
    data,
    include: {
      parent: true,
      children: true,
      inventoryItems: true,
    },
  });
}

async deleteInventoryCategory(id: string) {
  // Check if category has items
  const itemsCount = await this.prisma.inventoryItem.count({
    where: { categoryId: id },
  });

  if (itemsCount > 0) {
    throw new Error('Cannot delete category with items');
  }

  // Check if category has children
  const childrenCount = await this.prisma.inventoryCategory.count({
    where: { parentId: id },
  });

  if (childrenCount > 0) {
    throw new Error('Cannot delete category with subcategories');
  }

  return this.prisma.inventoryCategory.delete({
    where: { id },
  });
}

async getCategoryTree() {
  const categories = await this.prisma.inventoryCategory.findMany({
    where: { isActive: true },
    include: {
      children: {
        include: {
          children: true,
        },
      },
      inventoryItems: {
        include: {
          warehouseItems: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return categories.filter(category => !category.parentId);
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