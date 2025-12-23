import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { WorkshopResponseDto } from './dto/workshop-response.dto';

@Injectable()
export class WorkshopService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkshopDto): Promise<WorkshopResponseDto> {
    const { restaurantIds, networkId, ...workshopData } = dto;

    // Проверяем существование сети, если указана
    if (networkId) {
      const network = await this.prisma.network.findUnique({
        where: { id: networkId },
      });
      if (!network) {
        throw new NotFoundException(`Сеть с ID ${networkId} не найдена`);
      }
    }

    // Создаем цех
    const workshop = await this.prisma.workshop.create({
      data: {
        name: workshopData.name,
        networkId,
      },
    });

    // Если переданы рестораны, создаем связи
    if (restaurantIds && restaurantIds.length > 0) {
      // Проверяем, принадлежат ли рестораны указанной сети
      if (networkId) {
        const restaurants = await this.prisma.restaurant.findMany({
          where: {
            id: { in: restaurantIds },
            networkId,
          },
        });

        if (restaurants.length !== restaurantIds.length) {
          throw new NotFoundException('Некоторые рестораны не найдены или не принадлежат указанной сети');
        }
      }

      await this.prisma.restaurantWorkshop.createMany({
        data: restaurantIds.map(restaurantId => ({
          workshopId: workshop.id,
          restaurantId,
        })),
        skipDuplicates: true,
      });
    }

    return this.findOne(workshop.id);
  }

  async update(id: string, dto: UpdateWorkshopDto): Promise<WorkshopResponseDto> {
    const { restaurantIds, networkId, ...workshopData } = dto;

    // Проверяем существование цеха
    const existingWorkshop = await this.prisma.workshop.findUnique({
      where: { id },
    });

    if (!existingWorkshop) {
      throw new NotFoundException('Цех не найден');
    }

    // Проверяем существование сети, если указана
    if (networkId) {
      const network = await this.prisma.network.findUnique({
        where: { id: networkId },
      });
      if (!network) {
        throw new NotFoundException(`Сеть с ID ${networkId} не найдена`);
      }
    }

    // Обновляем основные данные цеха
    const workshop = await this.prisma.workshop.update({
      where: { id },
      data: {
        ...workshopData,
        networkId: networkId === undefined ? undefined : networkId,
      },
    });

    // Если переданы рестораны, обновляем связи
    if (restaurantIds !== undefined) {
      // Проверяем, принадлежат ли рестораны сети цеха
      if (workshop.networkId) {
        const restaurants = await this.prisma.restaurant.findMany({
          where: {
            id: { in: restaurantIds },
            networkId: workshop.networkId,
          },
        });

        if (restaurants.length !== restaurantIds.length) {
          throw new NotFoundException('Некоторые рестораны не найдены или не принадлежат сети цеха');
        }
      }

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
        },
        network: {
          select: {
            id: true,
            name: true
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
        },
        network: {
          select: {
            id: true,
            name: true
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

    // Удаляем связи с пользователями
    await this.prisma.userWorkshop.deleteMany({
      where: { workshopId: id },
    });

    // Удаляем связи с продуктами
    await this.prisma.productWorkshop.deleteMany({
      where: { workshopId: id },
    });

    await this.prisma.workshop.delete({
      where: { id },
    });
  }

  // Методы для работы с пользователями
  async addUsers(workshopId: string, userIds: string[]): Promise<void> {
    // Проверяем существование цеха
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
    });

    if (!workshop) {
      throw new NotFoundException('Цех не найден');
    }

    // Проверяем, принадлежат ли пользователи сети цеха
    if (workshop.networkId) {
      const users = await this.prisma.user.findMany({
        where: {
          id: { in: userIds },
          networks: {
            some: {
              id: workshop.networkId
            }
          }
        },
      });

      if (users.length !== userIds.length) {
        throw new NotFoundException('Некоторые пользователи не найдены или не принадлежат сети цеха');
      }
    }

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

  // Методы для работы с ресторанами
  async addRestaurants(workshopId: string, restaurantIds: string[]): Promise<void> {
    // Проверяем существование цеха
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
    });

    if (!workshop) {
      throw new NotFoundException('Цех не найден');
    }

    // Проверяем, принадлежат ли рестораны сети цеха
    if (workshop.networkId) {
      const restaurants = await this.prisma.restaurant.findMany({
        where: {
          id: { in: restaurantIds },
          networkId: workshop.networkId,
        },
      });

      if (restaurants.length !== restaurantIds.length) {
        throw new NotFoundException('Некоторые рестораны не найдены или не принадлежат сети цеха');
      }
    }

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
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException(`Ресторан с ID ${restaurantId} не найден`);
    }

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
        network: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc',
      },
    });

    return workshops.map(workshop => this.mapToDto(workshop));
  }

  // Новые методы для работы с сетями
  async findByNetworkId(networkId: string): Promise<WorkshopResponseDto[]> {
    // Проверяем существование сети
    const network = await this.prisma.network.findUnique({
      where: { id: networkId },
    });

    if (!network) {
      throw new NotFoundException(`Сеть с ID ${networkId} не найдена`);
    }

    const workshops = await this.prisma.workshop.findMany({
      where: {
        networkId,
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
        network: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc',
      },
    });

    return workshops.map(workshop => this.mapToDto(workshop));
  }

  async updateNetwork(workshopId: string, networkId: string | null): Promise<WorkshopResponseDto> {
    // Проверяем существование цеха
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
    });

    if (!workshop) {
      throw new NotFoundException('Цех не найден');
    }

    // Если указана сеть, проверяем ее существование
    if (networkId) {
      const network = await this.prisma.network.findUnique({
        where: { id: networkId },
      });
      if (!network) {
        throw new NotFoundException(`Сеть с ID ${networkId} не найдена`);
      }
    }

    // Обновляем сеть цеха
    const updatedWorkshop = await this.prisma.workshop.update({
      where: { id: workshopId },
      data: {
        networkId,
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
        network: {
          select: {
            id: true,
            name: true
          }
        }
      },
    });

    // Если удаляем сеть, удаляем все связи с ресторанами
    if (networkId === null) {
      await this.prisma.restaurantWorkshop.deleteMany({
        where: { workshopId },
      });
    }

    return this.mapToDto(updatedWorkshop);
  }

  private mapToDto(workshop: any): WorkshopResponseDto {
    return {
      id: workshop.id,
      name: workshop.name,
      networkId: workshop.networkId,
      restaurantIds: workshop.restaurants?.map((rw: any) => rw.restaurantId) || [],
      userIds: workshop.users?.map((uw: any) => uw.userId) || [],
      createdAt: workshop.createdAt,
      updatedAt: workshop.updatedAt,
      network: workshop.network ? {
        id: workshop.network.id,
        name: workshop.network.name
      } : undefined,
    };
  }
}