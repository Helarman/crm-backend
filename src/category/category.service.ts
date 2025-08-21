import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CategoryDto } from './dto/category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.category.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        image: dto.image,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        metaKeywords: dto.metaKeywords,
        parentId: dto.parentId,
        order: dto.order,
      },
    });
  }

  async update(id: string, dto: CategoryDto) {
    await this.getById(id);

    return this.prisma.category.update({
      where: { id },
      data: {
        title: dto.title,
        slug: dto.slug,
        image: dto.image,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        metaKeywords: dto.metaKeywords,
        parentId: dto.parentId,
        order: dto.order,
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
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async getTree() {
    const categories = await this.prisma.category.findMany({
      include: {
        children: {
          orderBy: { order: 'asc' },
          include: {
            children: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
      where: { parentId: null },
      orderBy: { order: 'asc' },
    });

    return categories;
  }
}