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
        restaurants: true,
        network: true,
      },
    });

    if (!category) throw new NotFoundException('Категория не найдена');

    return category;
  }

   async create(dto: CategoryDto) {
    const { order, clientOrder, restaurantIds, networkId, parentId, ...categoryData } = dto;

    const networkExists = await this.prisma.network.findUnique({
      where: { id: networkId }
    });
    
    if (!networkExists) {
      throw new NotFoundException('Сеть не найдена');
    }

    if (parentId) {
      const parentExists = await this.prisma.category.findUnique({
        where: { id: parentId }
      });
      
      if (!parentExists) {
        throw new NotFoundException('Родительская категория не найдена');
      }
    }

    let finalOrder = order;
    let finalClientOrder = clientOrder;

    if (order === undefined) {
      const maxOrder = await this.prisma.category.aggregate({
        where: { 
          parentId: dto.parentId || null,
          networkId: networkId 
        },
        _max: { order: true }
      });
      finalOrder = (maxOrder._max.order || 0) + 1;
    }

    if (clientOrder === undefined) {
      const maxClientOrder = await this.prisma.category.aggregate({
        where: { 
          parentId: dto.parentId || null,
          networkId: networkId
        },
        _max: { clientOrder: true }
      });
      finalClientOrder = (maxClientOrder._max.clientOrder || 0) + 1;
    }

    return this.prisma.category.create({
      data: {
        ...categoryData,
        order: finalOrder,
        clientOrder: finalClientOrder,
        network: {
          connect: { id: networkId }
        },
        restaurants: restaurantIds && restaurantIds.length > 0 ? {
          connect: restaurantIds.map(id => ({ id }))
        } : undefined,
      },
    });
  }

   async update(id: string, dto: CategoryDto) {
    const category = await this.getById(id);
    
    if (dto.networkId && dto.networkId !== category.networkId) {
      throw new BadRequestException('Нельзя изменить сеть категории');
    }

    const { order, clientOrder, restaurantIds, networkId, ...categoryData } = dto;

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
        restaurants: restaurantIds ? {
          set: restaurantIds.map(id => ({ id }))
        } : undefined,
      },
      include: {
        restaurants: true,
        network: true,
      },
    });
  }

  async delete(id: string) {
    await this.getById(id);

    const children = await this.prisma.category.count({
      where: { parentId: id },
    });

    if (children > 0) {
      throw new Error('Нельзя удалить категорию с подкатегориями');
    }

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
        restaurants: true,
        network: true, 
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
            restaurants: true,
            network: true, 
          },
        },
        restaurants: true,
        network: true, 
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

    const whereCondition = { parentId: category.parentId || null, networkId: category.networkId};

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
async getByRestaurant(restaurantId: string) {
    
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { networkId: true }
    });

    if (!restaurant) {
      throw new NotFoundException('Ресторан не найден');
    }

    return this.prisma.category.findMany({
      where: {
        restaurants: {
          some: {
            id: restaurantId
          }
        },
        networkId: restaurant.networkId, 
      },
      include: {
        children: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          where: {
            restaurants: {
              some: {
                id: restaurantId
              }
            },
            networkId: restaurant.networkId,
          },
        },
        products: {
          where: {
            restaurants: {
              some: {
                id: restaurantId
              }
            }
          }
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }
  async updateClientOrder(id: string, newClientOrder: number) {
    const category = await this.getById(id);

    if (newClientOrder < 1) {
      throw new BadRequestException('Порядок не может быть меньше 1');
    }

    const whereCondition = { parentId: category.parentId || null,  networkId: category.networkId};

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
 
  async getTreeByRestaurant(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { networkId: true }
    });

    if (!restaurant) {
      throw new NotFoundException('Ресторан не найден');
    }

    const categories = await this.prisma.category.findMany({
      include: {
        children: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          include: {
            children: {
              orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            },
          },
          where: {
            restaurants: {
              some: {
                id: restaurantId
              }
            },
            networkId: restaurant.networkId,
          },
        },
        products: {
          where: {
            restaurants: {
              some: {
                id: restaurantId
              }
            }
          }
        },
      },
      where: { 
        parentId: null,
        restaurants: {
          some: {
            id: restaurantId
          }
        },
        networkId: restaurant.networkId, 
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    return categories;
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
      where: { 
        parentId: category.parentId || null,
        networkId: category.networkId
      }
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
      where: { 
        parentId: category.parentId || null,
        networkId: category.networkId
      }
    });

    const maxOrder = Math.max(...siblings.map(cat => cat.clientOrder));

    if (category.clientOrder >= maxOrder) {
      throw new BadRequestException('Категория уже на последней позиции');
    }

    return this.updateClientOrder(id, category.clientOrder + 1);
  }

  async normalizeOrders(parentId?: string, networkId?: string) {
    const categories = await this.prisma.category.findMany({
      where: { 
        parentId: parentId || null,
        networkId: networkId 
      },
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

  async normalizeClientOrders(parentId?: string, networkId?: string) {
    const categories = await this.prisma.category.findMany({
      where: { 
        parentId: parentId || null,
        networkId: networkId
      },
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

  async getByNetwork(networkId: string) {
    const networkExists = await this.prisma.network.findUnique({
      where: { id: networkId }
    });
    
    if (!networkExists) {
      throw new NotFoundException('Сеть не найдена');
    }

    return this.prisma.category.findMany({
      where: {
        networkId: networkId
      },
      include: {
        children: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          where: {
            networkId: networkId
          },
        },
        restaurants: true,
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getTreeByNetwork(networkId: string) {
    const networkExists = await this.prisma.network.findUnique({
      where: { id: networkId }
    });
    
    if (!networkExists) {
      throw new NotFoundException('Сеть не найдена');
    }

    const categories = await this.prisma.category.findMany({
      include: {
        children: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          include: {
            children: {
              orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            },
            restaurants: true
          },
          where: {
            networkId: networkId
          },
        },
        restaurants: true
      },
      where: { 
        parentId: null,
        networkId: networkId
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    return categories;
  }
}