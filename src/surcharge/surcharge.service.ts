import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateSurchargeDto } from './dto/create-surcharge.dto';
import { UpdateSurchargeDto } from './dto/update-surcharge.dto';
import { EnumSurchargeType as SurchargeType, EnumOrderType as OrderType} from '@prisma/client';

@Injectable()
export class SurchargeService {
  constructor(private prisma: PrismaService) {}

 async create(createSurchargeDto: CreateSurchargeDto) {
    const { restaurantIds, ...surchargeData } = createSurchargeDto;

    // Фильтруем null/undefined значения
    const validRestaurantIds = (restaurantIds || []).filter(id => id != null);

    return this.prisma.surcharge.create({
        data: {
        ...surchargeData,
        restaurants: validRestaurantIds.length > 0 ? {
            create: validRestaurantIds.map(restaurantId => ({
            restaurant: { connect: { id: restaurantId } }
            }))
        } : undefined,
        },
        include: {
        restaurants: {
            include: {
            restaurant: true
            }
        }
        }
    });
    }

  async findAll() {
  return this.prisma.surcharge.findMany({
    include: {
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
}

  async findOne(id: string) {
    const surcharge = await this.prisma.surcharge.findUnique({
        where: { id },
        include: {
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
    const { restaurantIds, ...surchargeData } = updateSurchargeDto;

    // Проверяем существование надбавки
    await this.findOne(id);

    // Удаляем ВСЕ существующие связи перед созданием новых
    await this.prisma.restaurantSurcharge.deleteMany({
        where: { surchargeId: id }
    });

    // Создаем только уникальные связи
    const uniqueRestaurantIds = [...new Set(restaurantIds || [])];
    
    return this.prisma.surcharge.update({
        where: { id },
        data: {
        ...surchargeData,
        restaurants: uniqueRestaurantIds.length > 0 ? {
            create: uniqueRestaurantIds.map(restaurantId => ({
            restaurant: { connect: { id: restaurantId } }
            }))
        } : undefined,
        },
        include: {
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

  async getSurchargesForOrder(orderType: OrderType, restaurantId?: string) {
    const where: any = {
      isActive: true,
      orderTypes: {
        has: orderType
      },
    };

    if (restaurantId) {
      where.restaurants = {
        some: {
          restaurantId
        }
      };
    }

    return this.prisma.surcharge.findMany({
      where,
      orderBy: {
        createdAt: 'asc'
      }
    });
  }
}