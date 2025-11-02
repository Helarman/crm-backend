import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateDictionaryDto, CopyDictionaryDto } from './dto/create-dictionary.dto';
import { UpdateDictionaryDto } from './dto/update-dictionary.dto';

// Выносим типы моделей вне класса
type DictionaryModel = {
  create: (args: any) => Promise<any>;
  findMany: (args: any) => Promise<any>;
  findUnique: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
  updateMany: (args: any) => Promise<any>;
};

@Injectable()
export class DictionariesService {
  constructor(private prisma: PrismaService) {}

  // Общие методы для всех справочников
  private async createDictionaryItem(
    model: DictionaryModel,
    createDto: CreateDictionaryDto,
  ) {
    try {
      return await model.create({
        data: createDto,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Запись с таким именем уже существует для этого ресторана');
      }
      throw error;
    }
  }

  private async findAllDictionaryItems(model: DictionaryModel, restaurantId?: string) {
    const where = restaurantId ? { restaurantId } : {};
    return model.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        restaurant: {
          select: {
            id: true,
            title: true, // Исправлено с name на title
          },
        },
      },
    });
  }

  private async findDictionaryItemById(model: DictionaryModel, id: string) {
    const item = await model.findUnique({
      where: { id },
      include: {
        restaurant: {
          select: {
            id: true,
            title: true, // Исправлено с name на title
          },
        },
      },
    });
    
    if (!item) {
      throw new NotFoundException(`Запись с ID ${id} не найдена`);
    }
    return item;
  }

  private async updateDictionaryItem(
    model: DictionaryModel,
    id: string,
    updateDto: UpdateDictionaryDto,
  ) {
    try {
      return await model.update({
        where: { id },
        data: updateDto,
        include: {
          restaurant: {
            select: {
              id: true,
              title: true, // Исправлено с name на title
            },
          },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Запись с ID ${id} не найдена`);
      }
      if (error.code === 'P2002') {
        throw new ConflictException('Запись с таким именем уже существует для этого ресторана');
      }
      throw error;
    }
  }

  private async removeDictionaryItem(model: DictionaryModel, id: string) {
    try {
      return await model.delete({
        where: { id },
        include: {
          restaurant: {
            select: {
              id: true,
              title: true, // Исправлено с name на title
            },
          },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Запись с ID ${id} не найдена`);
      }
      throw error;
    }
  }

  // Причины списания
  async createWriteOffReason(createDto: CreateDictionaryDto) {
    return this.createDictionaryItem(this.prisma.reasonWriteOff, createDto);
  }

  async findAllWriteOffReasons(restaurantId?: string) {
    return this.findAllDictionaryItems(this.prisma.reasonWriteOff, restaurantId);
  }

  async findWriteOffReasonById(id: string) {
    return this.findDictionaryItemById(this.prisma.reasonWriteOff, id);
  }

  async updateWriteOffReason(id: string, updateDto: UpdateDictionaryDto) {
    return this.updateDictionaryItem(this.prisma.reasonWriteOff, id, updateDto);
  }

  async removeWriteOffReason(id: string) {
    return this.removeDictionaryItem(this.prisma.reasonWriteOff, id);
  }

  // Причины прихода
  async createReceiptReason(createDto: CreateDictionaryDto) {
    return this.createDictionaryItem(this.prisma.reasonReceipt, createDto);
  }

  async findAllReceiptReasons(restaurantId?: string) {
    return this.findAllDictionaryItems(this.prisma.reasonReceipt, restaurantId);
  }

  async findReceiptReasonById(id: string) {
    return this.findDictionaryItemById(this.prisma.reasonReceipt, id);
  }

  async updateReceiptReason(id: string, updateDto: UpdateDictionaryDto) {
    return this.updateDictionaryItem(this.prisma.reasonReceipt, id, updateDto);
  }

  async removeReceiptReason(id: string) {
    return this.removeDictionaryItem(this.prisma.reasonReceipt, id);
  }

  // Причины перемещения
  async createMovementReason(createDto: CreateDictionaryDto) {
    return this.createDictionaryItem(this.prisma.reasonMovement, createDto);
  }

  async findAllMovementReasons(restaurantId?: string) {
    return this.findAllDictionaryItems(this.prisma.reasonMovement, restaurantId);
  }

  async findMovementReasonById(id: string) {
    return this.findDictionaryItemById(this.prisma.reasonMovement, id);
  }

  async updateMovementReason(id: string, updateDto: UpdateDictionaryDto) {
    return this.updateDictionaryItem(this.prisma.reasonMovement, id, updateDto);
  }

  async removeMovementReason(id: string) {
    return this.removeDictionaryItem(this.prisma.reasonMovement, id);
  }

  // Причины доходов
  async createIncomeReason(createDto: CreateDictionaryDto) {
    return this.createDictionaryItem(this.prisma.reasonIncome, createDto);
  }

  async findAllIncomeReasons(restaurantId?: string) {
    return this.findAllDictionaryItems(this.prisma.reasonIncome, restaurantId);
  }

  async findIncomeReasonById(id: string) {
    return this.findDictionaryItemById(this.prisma.reasonIncome, id);
  }

  async updateIncomeReason(id: string, updateDto: UpdateDictionaryDto) {
    return this.updateDictionaryItem(this.prisma.reasonIncome, id, updateDto);
  }

  async removeIncomeReason(id: string) {
    return this.removeDictionaryItem(this.prisma.reasonIncome, id);
  }

  // Причины расходов
  async createExpenseReason(createDto: CreateDictionaryDto) {
    return this.createDictionaryItem(this.prisma.reasonExpense, createDto);
  }

  async findAllExpenseReasons(restaurantId?: string) {
    return this.findAllDictionaryItems(this.prisma.reasonExpense, restaurantId);
  }

  async findExpenseReasonById(id: string) {
    return this.findDictionaryItemById(this.prisma.reasonExpense, id);
  }

  async updateExpenseReason(id: string, updateDto: UpdateDictionaryDto) {
    return this.updateDictionaryItem(this.prisma.reasonExpense, id, updateDto);
  }

  async removeExpenseReason(id: string) {
    return this.removeDictionaryItem(this.prisma.reasonExpense, id);
  }

  // Копирование справочников между ресторанами
  async copyReasonsBetweenRestaurants(copyDto: CopyDictionaryDto) {
    const { sourceRestaurantId, targetRestaurantId, overwrite = false } = copyDto;

    // Проверяем существование ресторанов
    const [sourceRestaurant, targetRestaurant] = await Promise.all([
      this.prisma.restaurant.findUnique({ where: { id: sourceRestaurantId } }),
      this.prisma.restaurant.findUnique({ where: { id: targetRestaurantId } }),
    ]);

    if (!sourceRestaurant) {
      throw new NotFoundException(`Ресторан-источник с ID ${sourceRestaurantId} не найден`);
    }
    if (!targetRestaurant) {
      throw new NotFoundException(`Ресторан-назначение с ID ${targetRestaurantId} не найден`);
    }

    const results = {
      writeOffReasons: { copied: 0, skipped: 0 },
      receiptReasons: { copied: 0, skipped: 0 },
      movementReasons: { copied: 0, skipped: 0 },
      incomeReasons: { copied: 0, skipped: 0 },
      expenseReasons: { copied: 0, skipped: 0 },
    };

    // Вспомогательная функция для копирования
    const copyReasons = async (model: DictionaryModel, resultKey: keyof typeof results) => {
      const reasons = await model.findMany({
        where: { restaurantId: sourceRestaurantId },
      });

      for (const reason of reasons) {
        try {
          await model.create({
            data: {
              name: reason.name,
              isActive: reason.isActive,
              restaurantId: targetRestaurantId,
            },
          });
          results[resultKey].copied++;
        } catch (error: any) {
          if (error.code === 'P2002') {
            if (overwrite) {
              await model.updateMany({
                where: { 
                  name: reason.name, 
                  restaurantId: targetRestaurantId 
                },
                data: { 
                  isActive: reason.isActive 
                },
              });
              results[resultKey].copied++;
            } else {
              results[resultKey].skipped++;
            }
          } else {
            throw error;
          }
        }
      }
    };

    // Копируем все типы причин
    await copyReasons(this.prisma.reasonWriteOff, 'writeOffReasons');
    await copyReasons(this.prisma.reasonReceipt, 'receiptReasons');
    await copyReasons(this.prisma.reasonMovement, 'movementReasons');
    await copyReasons(this.prisma.reasonIncome, 'incomeReasons');
    await copyReasons(this.prisma.reasonExpense, 'expenseReasons');

    return {
      message: 'Копирование завершено',
      results,
    };
  }

  // Альтернативный метод для копирования конкретного типа справочника
  async copySpecificReasons(
    type: 'writeOff' | 'receipt' | 'movement' | 'income' | 'expense',
    copyDto: CopyDictionaryDto,
  ) {
    const { sourceRestaurantId, targetRestaurantId, overwrite = false } = copyDto;

    // Проверяем существование ресторанов
    const [sourceRestaurant, targetRestaurant] = await Promise.all([
      this.prisma.restaurant.findUnique({ where: { id: sourceRestaurantId } }),
      this.prisma.restaurant.findUnique({ where: { id: targetRestaurantId } }),
    ]);

    if (!sourceRestaurant) {
      throw new NotFoundException(`Ресторан-источник с ID ${sourceRestaurantId} не найден`);
    }
    if (!targetRestaurant) {
      throw new NotFoundException(`Ресторан-назначение с ID ${targetRestaurantId} не найден`);
    }

    const modelMap: Record<typeof type, DictionaryModel> = {
      writeOff: this.prisma.reasonWriteOff,
      receipt: this.prisma.reasonReceipt,
      movement: this.prisma.reasonMovement,
      income: this.prisma.reasonIncome,
      expense: this.prisma.reasonExpense,
    };

    const model = modelMap[type];
    const reasons = await model.findMany({
      where: { restaurantId: sourceRestaurantId },
    });

    const result = { copied: 0, skipped: 0 };

    for (const reason of reasons) {
      try {
        await model.create({
          data: {
            name: reason.name,
            isActive: reason.isActive,
            restaurantId: targetRestaurantId,
          },
        });
        result.copied++;
      } catch (error: any) {
        if (error.code === 'P2002') {
          if (overwrite) {
            await model.updateMany({
              where: { 
                name: reason.name, 
                restaurantId: targetRestaurantId 
              },
              data: { 
                isActive: reason.isActive 
              },
            });
            result.copied++;
          } else {
            result.skipped++;
          }
        } else {
          throw error;
        }
      }
    }

    return {
      message: `Копирование причин типа ${type} завершено`,
      result,
    };
  }
}