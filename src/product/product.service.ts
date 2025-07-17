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
    const { restaurantPrices, additives, categoryId, workshopIds,ingredients, ...productData } = dto;
    
    // Создаем продукт
    const product = await this.prisma.product.create({
        data: {
          ...productData,
          description: productData.description || '',
          category: categoryId ? { connect: { id: categoryId } } : undefined,
          additives: additives ? { connect: additives.map(id => ({ id })) } : undefined,
          workshops: workshopIds ? {
            create: workshopIds.map(id => ({
              workshop: { connect: { id } }
            }))
          } : undefined,
          ingredients: ingredients ? {
            create: ingredients.map(ing => ({
              quantity: ing.quantity,
              inventoryItem: { connect: { id: ing.inventoryItemId } }
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
    const { restaurantPrices, additives, categoryId, workshopIds, ingredients, ...productData } = dto;
    
    // Удаляем старые связи с ингредиентами
    await this.prisma.productIngredient.deleteMany({
      where: { productId: id }
    });

    // Удаляем старые связи с workshops
    await this.prisma.productWorkshop.deleteMany({
      where: { productId: id }
    });

    // Обновляем продукт
    await this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        description: productData.description || '',
        category: categoryId ? { connect: { id: categoryId } } : undefined,
        additives: additives ? { set: additives.map(id => ({ id })) } : undefined,
        ingredients: ingredients ? {
          create: ingredients.map(ing => ({
            quantity: ing.quantity,
            inventoryItem: { connect: { id: ing.inventoryItemId } }
          }))
        } : undefined,
        workshops: workshopIds ? {
          create: workshopIds.map(workshopId => ({
            workshop: { connect: { id: workshopId } }
          }))
        } : undefined,
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

  await this.prisma.orderItem.deleteMany({
    where: { productId: id }
  });

  await this.prisma.productDiscount.deleteMany({
    where: { productId: id }
  });

  await this.prisma.productWorkshop.deleteMany({
    where: { productId: id }
  });

  await this.prisma.restaurantProductPrice.deleteMany({
    where: { productId: id },
  });

  await this.prisma.productIngredient.deleteMany({
    where: { productId: id }
  });

  return this.prisma.product.delete({
    where: { id },
  });
}
  async getByCategory(categoryId: string) {
    return this.prisma.product.findMany({
      where: {
        categoryId,
        publishedOnWebsite: true 
      },
      include: {
        restaurantPrices: {
          where: {
            isStopList: false 
          }
        },
        category: true,
        additives: true,
        workshops: {
          include: {
            workshop: true
          }
        },
      },
      orderBy: {
        createdAt: 'desc' 
      }
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

  async getIngredients(productId: string) {
  const ingredients = await this.prisma.productIngredient.findMany({
    where: { productId },
    select: {
      inventoryItemId: true,
      quantity: true,
      inventoryItem: {
        select: {
          name: true,
          unit: true
        }
      }
    }
  });
  return ingredients.map(i => ({
    inventoryItemId: i.inventoryItemId,
    quantity: i.quantity,
    name: i.inventoryItem.name,
    unit: i.inventoryItem.unit
  }));
  }
}