import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CategoryDto } from './dto/category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) { }

  async getById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        parent: true,
        products: true,
      },
    });

    if (!category) throw new NotFoundException('Категория не найдена');

    return category;
  }

  async create(dto: CategoryDto) {
    const { order, clientOrder, ...categoryData } = dto;

    let finalOrder = order;
    let finalClientOrder = clientOrder;

    if (order === undefined) {
      const maxOrder = await this.prisma.category.aggregate({
        where: { parentId: dto.parentId || null },
        _max: { order: true }
      });
      finalOrder = (maxOrder._max.order || 0) + 1;
    }

    if (clientOrder === undefined) {
      const maxClientOrder = await this.prisma.category.aggregate({
        where: { parentId: dto.parentId || null },
        _max: { clientOrder: true }
      });
      finalClientOrder = (maxClientOrder._max.clientOrder || 0) + 1;
    }

    return this.prisma.category.create({
      data: {
        ...categoryData,
        order: finalOrder,
        clientOrder: finalClientOrder,
      },
    });
  }

  async update(id: string, dto: CategoryDto) {
    await this.getById(id);

    const { order, clientOrder, ...categoryData } = dto;

    let orderData = {};
    let clientOrderData = {};

    if (order !== undefined) {
      orderData = { order };
    }
    if (clientOrder !== undefined) {
      clientOrderData = { clientOrder };
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...categoryData,
        ...orderData,
        ...clientOrderData,
      },
    });
  }


  async delete(id: string) {
    await this.getById(id);

    // Проверяем, есть ли подкатегории
    const children = await this.prisma.category.count({
      where: { parentId: id },
    });

    if (children > 0) {
      throw new Error('Нельзя удалить категорию с подкатегориями');
    }

    // Проверяем, есть ли товары в категории
    const products = await this.prisma.product.count({
      where: { categoryId: id },
    });

    if (products > 0) {
      throw new Error('Нельзя удалить категорию с товарами');
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }

  async getProductsByCategory(id: string) {
    await this.getById(id);

    return this.prisma.category.findUnique({
      where: { id },
      include: {
        products: true,
      },
    });
  }

  async getAll() {
    return this.prisma.category.findMany({
      include: {
        children: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getTree() {
    const categories = await this.prisma.category.findMany({
      include: {
        children: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          include: {
            children: {
              orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            },
          },
        },
      },
      where: { parentId: null },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    return categories;
  }
  async updateOrder(id: string, newOrder: number) {
    const category = await this.getById(id);

    if (newOrder < 1) {
      throw new BadRequestException('Порядок не может быть меньше 1');
    }

    const whereCondition = { parentId: category.parentId || null };

    if (newOrder !== category.order) {
      const categoryAtPosition = await this.prisma.category.findFirst({
        where: {
          ...whereCondition,
          order: newOrder,
          id: { not: id }
        }
      });

      if (categoryAtPosition) {
        await this.prisma.category.update({
          where: { id: categoryAtPosition.id },
          data: { order: category.order }
        });
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: { order: newOrder }
    });
  }

  async updateClientOrder(id: string, newClientOrder: number) {
    const category = await this.getById(id);

    if (newClientOrder < 1) {
      throw new BadRequestException('Порядок не может быть меньше 1');
    }

    const whereCondition = { parentId: category.parentId || null };

    if (newClientOrder !== category.clientOrder) {
      const categoryAtPosition = await this.prisma.category.findFirst({
        where: {
          ...whereCondition,
          clientOrder: newClientOrder,
          id: { not: id }
        }
      });

      if (categoryAtPosition) {
        await this.prisma.category.update({
          where: { id: categoryAtPosition.id },
          data: { clientOrder: category.clientOrder }
        });
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: { clientOrder: newClientOrder }
    });
  }

  async moveUp(id: string) {
    const category = await this.getById(id);

    if (category.order <= 1) {
      throw new BadRequestException('Категория уже на первой позиции');
    }

    return this.updateOrder(id, category.order - 1);
  }

  async moveDown(id: string) {
    const category = await this.getById(id);

    const siblings = await this.prisma.category.findMany({
      where: { parentId: category.parentId || null }
    });

    const maxOrder = Math.max(...siblings.map(cat => cat.order));

    if (category.order >= maxOrder) {
      throw new BadRequestException('Категория уже на последней позиции');
    }

    return this.updateOrder(id, category.order + 1);
  }

  async moveUpOnClient(id: string) {
    const category = await this.getById(id);

    if (category.clientOrder <= 1) {
      throw new BadRequestException('Категория уже на первой позиции');
    }

    return this.updateClientOrder(id, category.clientOrder - 1);
  }

  async moveDownOnClient(id: string) {
    const category = await this.getById(id);

    const siblings = await this.prisma.category.findMany({
      where: { parentId: category.parentId || null }
    });

    const maxOrder = Math.max(...siblings.map(cat => cat.clientOrder));

    if (category.clientOrder >= maxOrder) {
      throw new BadRequestException('Категория уже на последней позиции');
    }

    return this.updateClientOrder(id, category.clientOrder + 1);
  }

  // Методы для нормализации порядков
  async normalizeOrders(parentId?: string) {
    const categories = await this.prisma.category.findMany({
      where: { parentId: parentId || null },
      orderBy: { order: 'asc' }
    });

    for (let i = 0; i < categories.length; i++) {
      await this.prisma.category.update({
        where: { id: categories[i].id },
        data: { order: i + 1 }
      });
    }

    return categories.length;
  }

  async normalizeClientOrders(parentId?: string) {
    const categories = await this.prisma.category.findMany({
      where: { parentId: parentId || null },
      orderBy: { clientOrder: 'asc' }
    });

    for (let i = 0; i < categories.length; i++) {
      await this.prisma.category.update({
        where: { id: categories[i].id },
        data: { clientOrder: i + 1 }
      });
    }

    return categories.length;
  }


}