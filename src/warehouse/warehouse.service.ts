import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WarehouseService {
  constructor(private prisma: PrismaService) { }

  async getAllInventoryItems() {
    return this.prisma.inventoryItem.findMany({
      where: { isActive: true },
      include: {
        storageLocation: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        product: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
  }

  async getRestaurantWarehouse(restaurantId: string) {
    return this.prisma.warehouse.findUnique({
      where: { restaurantId },
      include: {
        storageLocations: true,
        inventoryItems: {
          include: {
            storageLocation: true,
            product: true,
          },
        },
      },
    });
  }

  async createWarehouse(data: { restaurantId: string; name: string; description?: string }) {
    return this.prisma.warehouse.create({
      data: {
        name: data.name,
        description: data.description,
        restaurant: { connect: { id: data.restaurantId } },
      },
    });
  }

  async updateWarehouse(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
    return this.prisma.warehouse.update({
      where: { id },
      data,
    });
  }

  async addStorageLocation(warehouseId: string, data: { name: string; code?: string; description?: string }) {
    return this.prisma.storageLocation.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        warehouse: { connect: { id: warehouseId } },
      },
    });
  }

  async updateStorageLocation(
    id: string,
    data: { name?: string; code?: string; description?: string; isActive?: boolean },
  ) {
    return this.prisma.storageLocation.update({
      where: { id },
      data,
    });
  }

  async deleteStorageLocation(id: string) {
    // Перед удалением проверяем, есть ли связанные inventoryItems
    const items = await this.prisma.inventoryItem.count({
      where: { storageLocationId: id },
    });

    if (items > 0) {
      throw new Error('Нельзя удалить место хранения, так как есть связанные позиции');
    }

    return this.prisma.storageLocation.delete({
      where: { id },
    });
  }

  async addInventoryItem(
    warehouseId: string,
    data: {
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
    const quantity = data.quantity || 0;

    return this.prisma.inventoryItem.create({
      data: {
        name: data.name,
        description: data.description,
        unit: data.unit,
        quantity,
        minQuantity: data.minQuantity,
        cost: data.cost,
        warehouse: { connect: { id: warehouseId } },
        storageLocation: data.storageLocationId ? { connect: { id: data.storageLocationId } } : undefined,
        product: data.productId ? { connect: { id: data.productId } } : undefined,
      },
    });
  }

  async updateInventoryItem(
    id: string,
    data: {
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
    return this.prisma.inventoryItem.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        unit: data.unit,
        minQuantity: data.minQuantity,
        cost: data.cost,
        storageLocationId: data.storageLocationId,
        productId: data.productId,
        isActive: data.isActive,
      },
    });
  }

  async deleteInventoryItem(id: string) {
    // Мягкое удаление - просто помечаем как неактивное
    return this.prisma.inventoryItem.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getInventoryItemsByProduct(productId: string) {
    const inventoryItems = await this.prisma.inventoryItem.findMany({
      where: { productId },
      include: {
        storageLocation: true,
        warehouse: true,
        inventoryTransactions: {
          orderBy: {
            createdAt: 'desc'
          },
        }
      }
    });

    const productWithIngredients = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        ingredients: {
          include: {
            inventoryItem: {
              select: {
                id: true,
                name: true,
                unit: true,
                quantity: true
              }
            }
          }
        }
      }
    });

    return {
      product: {
        id: productWithIngredients.id,
        title: productWithIngredients.title,
        description: productWithIngredients.description,
        ingredients: productWithIngredients.ingredients.map(i => ({
          id: i.inventoryItem.id,
          name: i.inventoryItem.name,
          unit: i.inventoryItem.unit,
          requiredQuantity: i.quantity,
          currentQuantity: i.inventoryItem.quantity
        }))
      },
      inventoryItems: inventoryItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        warehouse: item.warehouse,
        storageLocation: item.storageLocation,
        lastTransactions: item.inventoryTransactions
      }))
    };
  }

  async receiveInventory(
    id: string,
    data: { quantity: number; reason?: string; documentId?: string; userId?: string },
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const item = await prisma.inventoryItem.findUnique({ where: { id } });
      if (!item) {
        throw new Error('Позиция не найдена');
      }

      const newQuantity = item.quantity + data.quantity;

      // Создаем транзакцию
      await prisma.inventoryTransaction.create({
        data: {
          type: 'RECEIPT',
          quantity: data.quantity,
          previousQuantity: item.quantity,
          newQuantity,
          reason: data.reason,
          documentId: data.documentId,
          inventoryItem: { connect: { id } },
          user: data.userId ? { connect: { id: data.userId } } : undefined,
        },
      });

      // Обновляем количество
      return prisma.inventoryItem.update({
        where: { id },
        data: { quantity: newQuantity },
      });
    });
  }

  async writeOffInventory(
    id: string,
    data: { quantity: number; reason?: string; documentId?: string; userId?: string },
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const item = await prisma.inventoryItem.findUnique({ where: { id } });
      if (!item) {
        throw new Error('Позиция не найдена');
      }

      if (item.quantity < data.quantity) {
        throw new Error('Недостаточное количество для списания');
      }

      const newQuantity = item.quantity - data.quantity;

      // Создаем транзакцию
      await prisma.inventoryTransaction.create({
        data: {
          type: 'WRITE_OFF',
          quantity: data.quantity,
          previousQuantity: item.quantity,
          newQuantity,
          reason: data.reason,
          documentId: data.documentId,
          inventoryItem: { connect: { id } },
          user: data.userId ? { connect: { id: data.userId } } : undefined,
        },
      });

      // Обновляем количество
      return prisma.inventoryItem.update({
        where: { id },
        data: { quantity: newQuantity },
      });
    });
  }

  async bulkReceiveInventory(
    items: Array<{ id: string; quantity: number; reason?: string; documentId?: string }>,
    userId?: string,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const results = [];
      for (const item of items) {
        const result = await this.receiveInventoryPrivate(
          item.id,
          {
            quantity: item.quantity,
            reason: item.reason,
            documentId: item.documentId,
            userId,
          },
          prisma,
        );
        results.push(result);
      }
      return results;
    });
  }

  async bulkWriteOffInventory(
    items: Array<{ id: string; quantity: number; reason?: string; documentId?: string }>,
    userId?: string,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const results = [];
      for (const item of items) {
        const result = await this.writeOffInventoryPrivate(
          item.id,
          {
            quantity: item.quantity,
            reason: item.reason,
            documentId: item.documentId,
            userId,
          },
          prisma,
        );
        results.push(result);
      }
      return results;
    });
  }

  async getInventoryItemTransactions(id: string) {
    return this.prisma.inventoryTransaction.findMany({
      where: { inventoryItemId: id },
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
  }

  // Внутренний метод для использования в транзакциях
  private async receiveInventoryPrivate(
    id: string,
    data: { quantity: number; reason?: string; documentId?: string; userId?: string },
    prisma: Prisma.TransactionClient,
  ) {
    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) {
      throw new Error('Позиция не найдена');
    }

    const newQuantity = item.quantity + data.quantity;

    // Создаем транзакцию
    await prisma.inventoryTransaction.create({
      data: {
        type: 'RECEIPT',
        quantity: data.quantity,
        previousQuantity: item.quantity,
        newQuantity,
        reason: data.reason,
        documentId: data.documentId,
        inventoryItem: { connect: { id } },
        user: data.userId ? { connect: { id: data.userId } } : undefined,
      },
    });

    // Обновляем количество
    return prisma.inventoryItem.update({
      where: { id },
      data: { quantity: newQuantity },
    });
  }

  // Внутренний метод для использования в транзакциях
  private async writeOffInventoryPrivate(
    id: string,
    data: { quantity: number; reason?: string; documentId?: string; userId?: string },
    prisma: Prisma.TransactionClient,
  ) {
    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) {
      throw new Error('Позиция не найдена');
    }

    if (item.quantity < data.quantity) {
      throw new Error('Недостаточное количество для списания');
    }

    const newQuantity = item.quantity - data.quantity;

    // Создаем транзакцию
    await prisma.inventoryTransaction.create({
      data: {
        type: 'WRITE_OFF',
        quantity: data.quantity,
        previousQuantity: item.quantity,
        newQuantity,
        reason: data.reason,
        documentId: data.documentId,
        inventoryItem: { connect: { id } },
        user: data.userId ? { connect: { id: data.userId } } : undefined,
      },
    });

    // Обновляем количество
    return prisma.inventoryItem.update({
      where: { id },
      data: { quantity: newQuantity },
    });
  }

  async getWarehouseTransactionsByPeriod(restaurantId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Неверный формат даты');
    }

    if (start > end) {
      throw new Error('Начальная дата не может быть позже конечной');
    }

    const endDatePlusDay = new Date(end);
    endDatePlusDay.setDate(endDatePlusDay.getDate() + 1);

    const transactions = await this.prisma.inventoryTransaction.findMany({
      where: {
        inventoryItem: {
          warehouse: {
            restaurantId: restaurantId
          }
        },
        createdAt: {
          gte: start,
          lt: endDatePlusDay
        }
      },
      include: {
        inventoryItem: {
          include: {
            warehouse: {
              select: {
                id: true,
                name: true
              }
            },
            product: {
              select: {
                id: true,
                title: true
              }
            },
            storageLocation: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const transactionsWithIngredients = await Promise.all(
      transactions.map(async (transaction) => {
        const productIngredients = await this.prisma.productIngredient.findMany({
          where: {
            inventoryItemId: transaction.inventoryItemId
          },
          include: {
            product: {
              select: {
                id: true,
                title: true
              }
            }
          }
        });

        let ingredients = [];
        if (transaction.inventoryItem.product) {
          ingredients = await this.prisma.productIngredient.findMany({
            where: {
              productId: transaction.inventoryItem.product.id
            },
            include: {
              inventoryItem: {
                select: {
                  id: true,
                  name: true,
                  unit: true
                }
              }
            }
          });
        }

        return {
          ...transaction,
          inventoryItem: {
            ...transaction.inventoryItem,
            productIngredients: productIngredients.map(pi => ({
              product: pi.product,
              quantity: pi.quantity
            })),
            ingredients: ingredients.map(i => ({
              inventoryItem: i.inventoryItem,
              quantity: i.quantity
            }))
          }
        };
      })
    );

    return transactionsWithIngredients;
  }

  async createPremix(data: {
    name: string;
    description?: string;
    unit: string;
    yield?: number;
    ingredients: Array<{
      inventoryItemId: string;
      quantity: number;
    }>;
    warehouseId: string;
  }) {
    return this.prisma.$transaction(async (prisma) => {
      // 1. Сначала создаём инвентарную позицию
      const inventoryItem = await prisma.inventoryItem.create({
        data: {
          name: data.name,
          description: data.description,
          unit: data.unit,
          quantity: 0,
          warehouseId: data.warehouseId,
        },
      });

      
      // 2. Затем создаём заготовку, используя правильный синтаксис связи
      const premix = await prisma.premix.create({
        data: {
          name: data.name,
          description: data.description,
          unit: data.unit,
          yield: data.yield || 1,
          inventoryItem: {   // Используем связь через объект
            connect: { id: inventoryItem.id }
          },
          ingredients: {
            create: data.ingredients.map(ingredient => ({
              inventoryItem: {
                connect: { id: ingredient.inventoryItemId }
              },
              quantity: ingredient.quantity,
            })),
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
  async preparePremix(premixId: string, quantity: number, userId?: string) {
    return this.prisma.$transaction(async (prisma) => {
      // 1. Получаем заготовку с ингредиентами
      const premix = await prisma.premix.findUnique({
        where: { id: premixId },
        include: {
          ingredients: {
            include: {
              inventoryItem: true,
            },
          },
          inventoryItem: true,
        },
      });

      if (!premix) {
        throw new Error('Заготовка не найдена');
      }

      if (!premix.inventoryItem) {
        throw new Error('Инвентарная позиция для заготовки не найдена');
      }

      // 2. Проверяем достаточность всех ингредиентов
      for (const ingredient of premix.ingredients) {
        const requiredQuantity = ingredient.quantity * quantity;
        if (ingredient.inventoryItem.quantity < requiredQuantity) {
          throw new Error(
            `Недостаточно ингредиента ${ingredient.inventoryItem.name}. Требуется: ${requiredQuantity}, доступно: ${ingredient.inventoryItem.quantity}`,
          );
        }
      }

      // 3. Списание ингредиентов
      for (const ingredient of premix.ingredients) {
        const requiredQuantity = ingredient.quantity * quantity;

        // Создаем транзакцию списания
        await prisma.inventoryTransaction.create({
          data: {
            type: 'WRITE_OFF',
            quantity: requiredQuantity,
            previousQuantity: ingredient.inventoryItem.quantity,
            newQuantity: ingredient.inventoryItem.quantity - requiredQuantity,
            reason: `Приготовление заготовки ${premix.name}`,
            inventoryItemId: ingredient.inventoryItem.id,
            userId: userId,
          },
        });

        // Обновляем количество
        await prisma.inventoryItem.update({
          where: { id: ingredient.inventoryItem.id },
          data: {
            quantity: {
              decrement: requiredQuantity,
            },
          },
        });
      }

      // 4. Добавление заготовки на склад
      const resultingQuantity = quantity * (premix.yield || 1);

      // Создаем транзакцию поступления
      await prisma.inventoryTransaction.create({
        data: {
          type: 'RECEIPT',
          quantity: resultingQuantity,
          previousQuantity: premix.inventoryItem.quantity,
          newQuantity: premix.inventoryItem.quantity + resultingQuantity,
          reason: `Приготовление заготовки ${premix.name}`,
          inventoryItemId: premix.inventoryItem.id,
          userId: userId,
        },
      });

      // Обновляем количество
      return prisma.inventoryItem.update({
        where: { id: premix.inventoryItem.id },
        data: {
          quantity: {
            increment: resultingQuantity,
          },
        },
        include: {
          premix: {
            include: {
              ingredients: {
                include: {
                  inventoryItem: true,
                },
              },
            },
          },
        },
      });
    });
  }

  async getPremixDetails(premixId: string) {
    return this.prisma.premix.findUnique({
      where: { id: premixId },
      include: {
        ingredients: {
          include: {
            inventoryItem: true,
          },
        },
        inventoryItem: true,
      },
    });
  }

  async listPremixes(warehouseId?: string) {
    const where: any = {};
    if (warehouseId) {
      where.inventoryItem = {
        warehouseId,
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
    });
  }

}