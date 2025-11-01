import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Основной метод для миграции всех порядков
   */
  async migrateAllOrders(): Promise<{
    categories: { admin: number; client: number };
    products: { admin: number; client: number };
  }> {
    this.logger.log('Starting migration of all orders...');

    const result = {
      categories: { admin: 0, client: 0 },
      products: { admin: 0, client: 0 }
    };

    try {
      // Мигрируем категории
      result.categories = await this.migrateCategoryOrders();
      
      // Мигрируем продукты
      result.products = await this.migrateProductOrders();

      this.logger.log('Migration completed successfully');
      return result;

    } catch (error) {
      this.logger.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Миграция порядков категорий
   */
  private async migrateCategoryOrders(): Promise<{ admin: number; client: number }> {
    this.logger.log('Migrating category orders...');

    let adminCount = 0;
    let clientCount = 0;

    // 1. Мигрируем корневые категории (parentId = null)
    const rootCategories = await this.prisma.category.findMany({
      where: { parentId: null },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
    });

    // Обновляем admin порядок для корневых категорий
    for (let i = 0; i < rootCategories.length; i++) {
      await this.prisma.category.update({
        where: { id: rootCategories[i].id },
        data: { order: i + 1 }
      });
    }
    adminCount += rootCategories.length;

    // Обновляем client порядок для корневых категорий
    for (let i = 0; i < rootCategories.length; i++) {
      await this.prisma.category.update({
        where: { id: rootCategories[i].id },
        data: { clientOrder: i + 1 }
      });
    }
    clientCount += rootCategories.length;

    // 2. Мигрируем подкатегории для каждого родителя
    for (const rootCategory of rootCategories) {
      const childCategories = await this.prisma.category.findMany({
        where: { parentId: rootCategory.id },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
      });

      // Admin порядок для подкатегорий
      for (let i = 0; i < childCategories.length; i++) {
        await this.prisma.category.update({
          where: { id: childCategories[i].id },
          data: { order: i + 1 }
        });
      }
      adminCount += childCategories.length;

      // Client порядок для подкатегорий
      for (let i = 0; i < childCategories.length; i++) {
        await this.prisma.category.update({
          where: { id: childCategories[i].id },
          data: { clientOrder: i + 1 }
        });
      }
      clientCount += childCategories.length;
    }

    this.logger.log(`Category orders migrated: ${adminCount} admin, ${clientCount} client`);
    return { admin: adminCount, client: clientCount };
  }

  /**
   * Миграция порядков продуктов
   */
  private async migrateProductOrders(): Promise<{ admin: number; client: number }> {
    this.logger.log('Migrating product orders...');

    let adminCount = 0;
    let clientCount = 0;

    // 1. Мигрируем продукты без категории (categoryId = null)
    const uncategorizedProducts = await this.prisma.product.findMany({
      where: { categoryId: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    });

    // Admin порядок для продуктов без категории
    for (let i = 0; i < uncategorizedProducts.length; i++) {
      await this.prisma.product.update({
        where: { id: uncategorizedProducts[i].id },
        data: { sortOrder: i + 1 }
      });
    }
    adminCount += uncategorizedProducts.length;

    // Client порядок для продуктов без категории
    for (let i = 0; i < uncategorizedProducts.length; i++) {
      await this.prisma.product.update({
        where: { id: uncategorizedProducts[i].id },
        data: { clientSortOrder: i + 1 }
      });
    }
    clientCount += uncategorizedProducts.length;

    // 2. Мигрируем продукты по категориям
    const categories = await this.prisma.category.findMany({
      select: { id: true }
    });

    for (const category of categories) {
      const categoryProducts = await this.prisma.product.findMany({
        where: { categoryId: category.id },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
      });

      // Admin порядок для продуктов категории
      for (let i = 0; i < categoryProducts.length; i++) {
        await this.prisma.product.update({
          where: { id: categoryProducts[i].id },
          data: { sortOrder: i + 1 }
        });
      }
      adminCount += categoryProducts.length;

      // Client порядок для продуктов категории
      for (let i = 0; i < categoryProducts.length; i++) {
        await this.prisma.product.update({
          where: { id: categoryProducts[i].id },
          data: { clientSortOrder: i + 1 }
        });
      }
      clientCount += categoryProducts.length;
    }

    this.logger.log(`Product orders migrated: ${adminCount} admin, ${clientCount} client`);
    return { admin: adminCount, client: clientCount };
  }

  /**
   * Проверка текущего состояния порядков
   */
  async checkOrderStatus(): Promise<{
    categories: {
      total: number;
      withZeroOrder: number;
      withZeroClientOrder: number;
      duplicates: { admin: any[]; client: any[] };
    };
    products: {
      total: number;
      withZeroSortOrder: number;
      withZeroClientSortOrder: number;
      duplicates: { admin: any[]; client: any[] };
    };
  }> {
    const categories = await this.prisma.category.findMany();
    const products = await this.prisma.product.findMany();

    // Проверка категорий
    const categoryDuplicatesAdmin = await this.findDuplicateCategoryOrders('order');
    const categoryDuplicatesClient = await this.findDuplicateCategoryOrders('clientOrder');

    // Проверка продуктов
    const productDuplicatesAdmin = await this.findDuplicateProductOrders('sortOrder');
    const productDuplicatesClient = await this.findDuplicateProductOrders('clientSortOrder');

    return {
      categories: {
        total: categories.length,
        withZeroOrder: categories.filter(c => c.order === 0).length,
        withZeroClientOrder: categories.filter(c => c.clientOrder === 0).length,
        duplicates: {
          admin: categoryDuplicatesAdmin,
          client: categoryDuplicatesClient
        }
      },
      products: {
        total: products.length,
        withZeroSortOrder: products.filter(p => p.sortOrder === 0).length,
        withZeroClientSortOrder: products.filter(p => p.clientSortOrder === 0).length,
        duplicates: {
          admin: productDuplicatesAdmin,
          client: productDuplicatesClient
        }
      }
    };
  }

  /**
   * Поиск дубликатов порядков в категориях
   */
  private async findDuplicateCategoryOrders(field: 'order' | 'clientOrder'): Promise<any[]> {
    const duplicates = await this.prisma.$queryRaw`
      SELECT ${field} as orderValue, COUNT(*) as count, 
             STRING_AGG(id, ', ') as ids,
             STRING_AGG(title, '; ') as titles
      FROM category 
      WHERE parentId IS NULL
      GROUP BY ${field}
      HAVING COUNT(*) > 1 AND ${field} > 0
      UNION ALL
      SELECT ${field} as orderValue, COUNT(*) as count,
             STRING_AGG(id, ', ') as ids,
             STRING_AGG(title, '; ') as titles
      FROM category 
      WHERE parentId IS NOT NULL
      GROUP BY parentId, ${field}
      HAVING COUNT(*) > 1 AND ${field} > 0
    `;
    return;
  }

  /**
   * Поиск дубликатов порядков в продуктах
   */
  private async findDuplicateProductOrders(field: 'sortOrder' | 'clientSortOrder'): Promise<any[]> {
    const duplicates = await this.prisma.$queryRaw`
      SELECT ${field} as orderValue, COUNT(*) as count,
             STRING_AGG(id, ', ') as ids,
             STRING_AGG(title, '; ') as titles
      FROM product 
      WHERE categoryId IS NULL
      GROUP BY ${field}
      HAVING COUNT(*) > 1 AND ${field} > 0
      UNION ALL
      SELECT ${field} as orderValue, COUNT(*) as count,
             STRING_AGG(id, ', ') as ids,
             STRING_AGG(title, '; ') as titles
      FROM product 
      WHERE categoryId IS NOT NULL
      GROUP BY categoryId, ${field}
      HAVING COUNT(*) > 1 AND ${field} > 0
    `;
    return;
  }

  /**
   * Сброс всех порядков к 0 (для тестирования)
   */
  async resetAllOrders(): Promise<{ categories: number; products: number }> {
    this.logger.log('Resetting all orders to 0...');

    const categoryResult = await this.prisma.category.updateMany({
      data: { order: 0, clientOrder: 0 }
    });

    const productResult = await this.prisma.product.updateMany({
      data: { sortOrder: 0, clientSortOrder: 0 }
    });

    this.logger.log(`Orders reset: ${categoryResult.count} categories, ${productResult.count} products`);
    
    return {
      categories: categoryResult.count,
      products: productResult.count
    };
  }
}