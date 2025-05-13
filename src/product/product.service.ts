import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ProductDto } from './dto/product.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async getAll(searchTerm?: string) {
    if (searchTerm) return this.getSearchTermFilter(searchTerm);

    return this.prisma.product.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        restaurantPrices: true,
        category: true,
        additives: true,
        workshops: {
          include: {
            workshop: true
          }
        },
      },
    });
  }

  private async getSearchTermFilter(searchTerm: string) {
    return this.prisma.product.findMany({
      where: {
        OR: [
          {
            title: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            workshops: {
              some: {
                workshop: {
                  name: {
                    contains: searchTerm,
                    mode: 'insensitive',
                  }
                }
              }
            }
          },
        ],
      },
      include: {
        restaurantPrices: true,
        category: true,
        additives: true,
        workshops: {
          include: {
            workshop: true
          }
        },
      },
    });
  }

  async getById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        restaurantPrices: true,
        category: true,
        additives: true,
        workshops: {
          include: {
            workshop: true
          }
        },
      },
    });

    if (!product) throw new NotFoundException('Товар не найден');
    return product;
  }

  async create(dto: ProductDto) {
    const { restaurantPrices, additives, categoryId, workshopIds, ...productData } = dto;
    
    // Создаем продукт
    const product = await this.prisma.product.create({
    data: {
      ...productData,
      description: productData.description || '',
      ingredients: productData.ingredients || '',
      category: categoryId ? { connect: { id: categoryId } } : undefined,
      additives: additives ? { connect: additives.map(id => ({ id })) } : undefined,
      workshops: workshopIds ? {
        create: workshopIds.map(id => ({
          workshop: { connect: { id } }
        }))
      } : undefined,
    },
  });

    // Создаем цены для ресторанов
    if (restaurantPrices?.length) {
      await this.prisma.restaurantProductPrice.createMany({
        data: restaurantPrices.map(rp => ({
          productId: product.id,
          restaurantId: rp.restaurantId,
          price: rp.price,
          isStopList: rp.isStopList,
        })),
      });
    }

    return this.getById(product.id);
  }

  async update(id: string, dto: ProductDto) {
    const { restaurantPrices, additives, categoryId, workshopIds, ...productData } = dto;
    
    // Сначала обновляем связи с цехами
    if (workshopIds) {
      // Удаляем все существующие связи
      await this.prisma.productWorkshop.deleteMany({
        where: { productId: id }
      });

      // Создаем новые связи
      if (workshopIds.length > 0) {
        await this.prisma.productWorkshop.createMany({
          data: workshopIds.map(workshopId => ({
            productId: id,
            workshopId
          }))
        });
      }
    }

    // Обновляем продукт
    await this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        description: productData.description || '',
        ingredients: productData.ingredients || '',
        category: categoryId ? { connect: { id: categoryId } } : undefined,
        additives: additives ? { set: additives.map(id => ({ id })) } : undefined,
      },
    });

    // Обновляем цены в ресторанах
    if (restaurantPrices) {
      await this.prisma.restaurantProductPrice.deleteMany({
        where: { productId: id },
      });

      if (restaurantPrices.length > 0) {
        await this.prisma.restaurantProductPrice.createMany({
          data: restaurantPrices.map(rp => ({
            productId: id,
            restaurantId: rp.restaurantId,
            price: rp.price,
            isStopList: rp.isStopList,
          })),
        });
      }
    }

    return this.getById(id);
  }

  async delete(id: string) {
    await this.getById(id);

    // Удаляем связанные данные
    await this.prisma.productWorkshop.deleteMany({
      where: { productId: id }
    });

    await this.prisma.restaurantProductPrice.deleteMany({
      where: { productId: id },
    });

    // Удаляем сам продукт
    return this.prisma.product.delete({
      where: { id },
    });
  }
  
  async getRestaurantPrices(productId: string) {
    const prices = await this.prisma.restaurantProductPrice.findMany({
      where: { productId },
      include: {
        restaurant: true
      }
    });

    if (!prices) throw new NotFoundException('Цены не найдены');
    
    return prices.map(price => ({
      restaurantId: price.restaurantId,
      restaurantName: price.restaurant.title,
      price: price.price,
      isStopList: price.isStopList
    }));
  }
}