import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { WorkshopResponseDto } from './dto/workshop-response.dto';

@Injectable()
export class WorkshopService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkshopDto): Promise<WorkshopResponseDto> {
    const { restaurantIds, ...workshopData } = dto;

    // Создаем цех
    const workshop = await this.prisma.workshop.create({
      data: {
        name: workshopData.name,
      },
    });

    // Если переданы рестораны, создаем связи
    if (restaurantIds && restaurantIds.length > 0) {
      await this.prisma.restaurantWorkshop.createMany({
        data: restaurantIds.map(restaurantId => ({
          workshopId: workshop.id,
          restaurantId,
        })),
        skipDuplicates: true,
      });
    }

    // Получаем цех с полными данными
    return this.findOne(workshop.id);
  }

  async update(id: string, dto: UpdateWorkshopDto): Promise<WorkshopResponseDto> {
    const { restaurantIds, ...workshopData } = dto;

    // Обновляем основные данные цеха
    const workshop = await this.prisma.workshop.update({
      where: { id },
      data: workshopData,
    });

    // Если переданы рестораны, обновляем связи
    if (restaurantIds !== undefined) {
      // Удаляем старые связи
      await this.prisma.restaurantWorkshop.deleteMany({
        where: { workshopId: id },
      });

      // Создаем новые связи (если массив не пустой)
      if (restaurantIds.length > 0) {
        await this.prisma.restaurantWorkshop.createMany({
          data: restaurantIds.map(restaurantId => ({
            workshopId: id,
            restaurantId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return this.findOne(id);
  }

  async findAll(): Promise<WorkshopResponseDto[]> {
    const workshops = await this.prisma.workshop.findMany({
      include: {
        restaurants: {
          include: {
            restaurant: true
          }
        }
      }
    });
    return workshops.map(this.mapToDto);
  }

  async findOne(id: string): Promise<WorkshopResponseDto> {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id },
      include: {
        restaurants: {
          include: {
            restaurant: true
          }
        }
      }
    });

    if (!workshop) {
      throw new NotFoundException('Цех не найден');
    }

    return this.mapToDto(workshop);
  }


  async delete(id: string): Promise<void> {
    // Удаляем связи с ресторанами перед удалением цеха
    await this.prisma.restaurantWorkshop.deleteMany({
      where: { workshopId: id },
    });

    await this.prisma.workshop.delete({
      where: { id },
    });
  }


  async addUsers(workshopId: string, userIds: string[]): Promise<void> {
    await this.prisma.userWorkshop.createMany({
      data: userIds.map(userId => ({
        workshopId,
        userId,
      })),
      skipDuplicates: true,
    });
  }

  async removeUsers(workshopId: string, userIds: string[]): Promise<void> {
    await this.prisma.userWorkshop.deleteMany({
      where: {
        workshopId,
        userId: {
          in: userIds,
        },
      },
    });
  }

  async getUsers(workshopId: string): Promise<string[]> {
    const userWorkshops = await this.prisma.userWorkshop.findMany({
      where: { workshopId },
      select: { userId: true },
    });
    
    return userWorkshops.map(uw => uw.userId);
  }

  // Новые методы для работы с ресторанами
  async addRestaurants(workshopId: string, restaurantIds: string[]): Promise<void> {
    await this.prisma.restaurantWorkshop.createMany({
      data: restaurantIds.map(restaurantId => ({
        workshopId,
        restaurantId,
      })),
      skipDuplicates: true,
    });
  }

  async removeRestaurants(workshopId: string, restaurantIds: string[]): Promise<void> {
    await this.prisma.restaurantWorkshop.deleteMany({
      where: {
        workshopId,
        restaurantId: {
          in: restaurantIds,
        },
      },
    });
  }

  async getRestaurants(workshopId: string): Promise<string[]> {
    const restaurantWorkshops = await this.prisma.restaurantWorkshop.findMany({
      where: { workshopId },
      select: { restaurantId: true },
    });
    
    return restaurantWorkshops.map(rw => rw.restaurantId);
  }
   async findByRestaurantId(restaurantId: string): Promise<WorkshopResponseDto[]> {
    // Проверяем существование ресторана
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException(`Ресторан с ID ${restaurantId} не найден`);
    }

    // Ищем цехи, связанные с этим рестораном
    const workshops = await this.prisma.workshop.findMany({
      where: {
        restaurants: {
          some: {
            restaurantId: restaurantId,
          },
        },
      },
      include: {
        restaurants: {
          select: {
            restaurantId: true,
          },
        },
        users: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return workshops.map(workshop => this.mapToDto(workshop));
  }

  private mapToDto(workshop: any): WorkshopResponseDto {
    return {
      id: workshop.id,
      name: workshop.name,
      restaurantIds: workshop.restaurants?.map((rw: any) => rw.restaurantId) || [],
      userIds: workshop.users?.map((uw: any) => uw.userId) || [],
      createdAt: workshop.createdAt,
      updatedAt: workshop.updatedAt,
    };
  }

}