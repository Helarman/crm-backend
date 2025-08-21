import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InventoryTransactionType, Prisma } from '@prisma/client';
import { CreateInventoryTransactionDto, CreateWarehouseDto, CreateWarehouseItemDto } from './dto/warehouse.dto';

@Injectable()
export class WarehouseService {
  constructor(private prisma: PrismaService) {}

  // ==================== Warehouse Methods ====================

  async createWarehouse(data: CreateWarehouseDto) {
    return this.prisma.warehouse.create({
      data: {
        name: data.name,
        description: data.description,
        restaurant: {
          connect: { id: data.restaurantId }
        }
      }
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

  async createInventoryItem(data: Prisma.InventoryItemCreateInput) {
    return this.prisma.inventoryItem.create({
      data,
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
    type: InventoryTransactionType;
    quantity: number;
    userId?: string;
    reason?: string;
    documentId?: string;
  }) {
    return this.prisma.$transaction(async (prisma) => {
      // 1. Находим запись WarehouseItem
      const warehouseItem = await prisma.warehouseItem.findFirst({
        where: {
          inventoryItemId: data.inventoryItemId,
          warehouseId: data.warehouseId
        },
        select: {
          id: true,
          quantity: true,
          reserved: true
        }
      });

      if (!warehouseItem) {
        throw new Error('Warehouse item not found');
      }

      // 2. Рассчитываем новое количество
      let newQuantity: number;
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
          user: data.userId ? {
            connect: { id: data.userId }
          } : undefined
        }
      });

      // 4. Обновляем количество в WarehouseItem (кроме трансферов)
      if (data.type !== 'TRANSFER') {
        await prisma.warehouseItem.update({
          where: { id: warehouseItem.id },
          data: { quantity: newQuantity }
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
        user: true,
      },
    });
  }

  async getInventoryTransactionsByItem(itemId: string) {
    return this.prisma.inventoryTransaction.findMany({
      where: { inventoryItemId: itemId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
      },
    });
  }

  async getWarehouseTransactions(warehouseId: string, filters: {
    startDate?: Date;
    endDate?: Date;
    type?: InventoryTransactionType;
  } = {}) {
    const where: Prisma.InventoryTransactionWhereInput = {
      inventoryItem: {
        warehouseItems: {
          some: {
            warehouseId,
          },
        },
      },
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

  // ==================== Utility Methods ====================

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

  async listInventoryItems(filters: {
    search?: string;
    isActive?: boolean;
  } = {}) {
    const where: Prisma.InventoryItemWhereInput = {};


    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return this.prisma.inventoryItem.findMany({
      where,
      include: {
        product: true,
        premix: true,
        warehouseItems: {
          include: {
            warehouse: true,
            storageLocation: true,
          },
        },
      },
      orderBy: { name: 'asc' },
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
}