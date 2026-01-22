// src/surcharge/surcharge.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateSurchargeDto } from './dto/create-surcharge.dto';
import { UpdateSurchargeDto } from './dto/update-surcharge.dto';
import { EnumSurchargeType as SurchargeType, EnumOrderType as OrderType } from '@prisma/client';

@Injectable()
export class SurchargeService {
  constructor(private prisma: PrismaService) {}

  async create(createSurchargeDto: CreateSurchargeDto) {
    const { restaurantIds, networkId, ...surchargeData } = createSurchargeDto;

    // Фильтруем null/undefined значения
    const validRestaurantIds = (restaurantIds || []).filter(id => id != null);

    return this.prisma.surcharge.create({
      data: {
        ...surchargeData,
        // Подключаем сеть если указана
        ...(networkId && {
          network: {
            connect: { id: networkId }
          }
        }),
        restaurants: validRestaurantIds.length > 0 ? {
          create: validRestaurantIds.map(restaurantId => ({
            restaurant: { connect: { id: restaurantId } }
          }))
        } : undefined,
      },
      include: {
        network: {
          select: {
            id: true,
            name: true
          }
        },
        restaurants: {
          include: {
            restaurant: true
          }
        }
      }
    });
  }

  async findAll(networkId?: string) {
    const where: any = {};

    // Добавляем фильтр по сети если указан
    if (networkId) {
      where.networkId = networkId;
    }

    return this.prisma.surcharge.findMany({
      where,
      include: {
        network: {
          select: {
            id: true,
            name: true
          }
        },
        restaurants: {
          include: {
            restaurant: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async findOne(id: string) {
    const surcharge = await this.prisma.surcharge.findUnique({
      where: { id },
      include: {
        network: {
          select: {
            id: true,
            name: true
          }
        },
        restaurants: {
          include: {
            restaurant: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      }
    });

    if (!surcharge) {
      throw new NotFoundException(`Surcharge with ID ${id} not found`);
    }

    return surcharge;
  }

  async update(id: string, updateSurchargeDto: UpdateSurchargeDto) {
    const { restaurantIds, networkId, ...surchargeData } = updateSurchargeDto;

    // Проверяем существование надбавки
    await this.findOne(id);

    // Обновляем данные надбавки
    const updateData: any = {
      ...surchargeData
    };

    // Обновляем связь с сетью если указано
    if (networkId !== undefined) {
      if (networkId === null) {
        updateData.network = { disconnect: true };
      } else {
        updateData.network = { connect: { id: networkId } };
      }
    }

    // Обновляем связи с ресторанами если указаны
    if (restaurantIds !== undefined) {
      // Удаляем ВСЕ существующие связи перед созданием новых
      await this.prisma.restaurantSurcharge.deleteMany({
        where: { surchargeId: id }
      });

      // Создаем только уникальные связи
      const uniqueRestaurantIds = [...new Set(restaurantIds || [])];
      
      if (uniqueRestaurantIds.length > 0) {
        updateData.restaurants = {
          create: uniqueRestaurantIds.map(restaurantId => ({
            restaurant: { connect: { id: restaurantId } }
          }))
        };
      }
    }

    return this.prisma.surcharge.update({
      where: { id },
      data: updateData,
      include: {
        network: {
          select: {
            id: true,
            name: true
          }
        },
        restaurants: {
          include: {
            restaurant: true
          }
        }
      }
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // Сначала удаляем связи с ресторанами
    await this.prisma.restaurantSurcharge.deleteMany({
      where: { surchargeId: id }
    });

    // Затем удаляем саму надбавку
    return this.prisma.surcharge.delete({
      where: { id }
    });
  }

  async getSurchargesForOrder(orderType: OrderType, restaurantId?: string, networkId?: string) {
    const where: any = {
      isActive: true,
      orderTypes: {
        has: orderType
      }
    };

    // Если указан restaurantId, ищем надбавки привязанные к этому ресторану
    if (restaurantId) {
      where.OR = [
        // Надбавки привязанные к конкретному ресторану
        {
          restaurants: {
            some: {
              restaurantId
            }
          }
        },
        // Надбавки привязанные к сети, к которой принадлежит ресторан
        {
          network: {
            restaurants: {
              some: {
                id: restaurantId
              }
            }
          }
        }
      ];
    } else if (networkId) {
      // Если указан только networkId, ищем надбавки сети
      where.networkId = networkId;
    }

    return this.prisma.surcharge.findMany({
      where,
      include: {
        network: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
  }

  // Новый метод: получение надбавок по сети
  async getSurchargesByNetwork(networkId: string, activeOnly: boolean = true) {
    const where: any = {
      networkId
    };

    if (activeOnly) {
      where.isActive = true;
    }

    return this.prisma.surcharge.findMany({
      where,
      include: {
        network: {
          select: {
            id: true,
            name: true
          }
        },
        restaurants: {
          include: {
            restaurant: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
}