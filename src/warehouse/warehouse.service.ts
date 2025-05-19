import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WarehouseService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.inventoryItem.findMany({
      where: { productId },
      include: {
        storageLocation: true,
        warehouse: true,
      },
    });
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
}