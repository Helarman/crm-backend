import {
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AddUserDto } from './dto/add-user.dto';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantService {
  constructor(
    private prisma: PrismaService,
  ) { }

  private includeUsers = {
    users: true
  };

  private readonly includeProducts = {
    products: true,
  };

  private includeDetails = {
    users: true,
    products: true,
    network: {
      include: {
        owner: true,
        tenant: true
      }
    },
    
  };

  async getAll() {
    return this.prisma.restaurant.findMany({
      include: this.includeDetails
    });
  }

  async getById(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: this.includeDetails
    });

    if (!restaurant) throw new NotFoundException('Ресторан не найден');
    return restaurant;
  }
  async create(dto: CreateRestaurantDto) {
    const network = await this.prisma.network.findUnique({
      where: { id: dto.networkId }
    });

    if (!network) {
      throw new NotFoundException('Сеть ресторанов не найдена');
    }

    const data: Prisma.RestaurantCreateInput = {
      title: dto.title,
      description: dto.description,
      address: dto.address,
      images: dto.images || [],
      latitude: dto.latitude,
      longitude: dto.longitude,
      legalInfo: dto.legalInfo,
      useWarehouse: dto.useWarehouse || false,
      allowNegativeStock: dto.allowNegativeStock || false,
      acceptOrders: dto.acceptOrders ?? true,
      shiftCloseTime: dto.shiftCloseTime || new Date('1970-01-01T23:59:00.000Z'),
      // Часы работы
      mondayOpen: dto.mondayOpen || new Date('1970-01-01T09:00:00.000Z'),
      mondayClose: dto.mondayClose || new Date('1970-01-01T18:00:00.000Z'),
      mondayIsWorking: dto.mondayIsWorking ?? true,

      tuesdayOpen: dto.tuesdayOpen || new Date('1970-01-01T09:00:00.000Z'),
      tuesdayClose: dto.tuesdayClose || new Date('1970-01-01T18:00:00.000Z'),
      tuesdayIsWorking: dto.tuesdayIsWorking ?? true,

      wednesdayOpen: dto.wednesdayOpen || new Date('1970-01-01T09:00:00.000Z'),
      wednesdayClose: dto.wednesdayClose || new Date('1970-01-01T18:00:00.000Z'),
      wednesdayIsWorking: dto.wednesdayIsWorking ?? true,

      thursdayOpen: dto.thursdayOpen || new Date('1970-01-01T09:00:00.000Z'),
      thursdayClose: dto.thursdayClose || new Date('1970-01-01T18:00:00.000Z'),
      thursdayIsWorking: dto.thursdayIsWorking ?? true,

      fridayOpen: dto.fridayOpen || new Date('1970-01-01T09:00:00.000Z'),
      fridayClose: dto.fridayClose || new Date('1970-01-01T18:00:00.000Z'),
      fridayIsWorking: dto.fridayIsWorking ?? true,

      saturdayOpen: dto.saturdayOpen,
      saturdayClose: dto.saturdayClose,
      saturdayIsWorking: dto.saturdayIsWorking ?? false,

      sundayOpen: dto.sundayOpen,
      sundayClose: dto.sundayClose,
      sundayIsWorking: dto.sundayIsWorking ?? false,

      network: {
        connect: { id: dto.networkId }
      }
    };

    return this.prisma.restaurant.create({
      data,
      include: this.includeDetails
    });
  }

  async update(restaurantId: string, dto: UpdateRestaurantDto) {
    await this.getById(restaurantId);

    const data: Prisma.RestaurantUpdateInput = {
      title: dto.title,
      description: dto.description,
      address: dto.address,
      images: dto.images,
      latitude: dto.latitude,
      longitude: dto.longitude,
      legalInfo: dto.legalInfo,
      useWarehouse: dto.useWarehouse,
      shiftCloseTime: dto.shiftCloseTime,
      allowNegativeStock: dto.allowNegativeStock || false,
      acceptOrders: dto.acceptOrders ?? true,
      mondayOpen: dto.mondayOpen,
      mondayClose: dto.mondayClose,
      mondayIsWorking: dto.mondayIsWorking,
      tuesdayOpen: dto.tuesdayOpen,
      tuesdayClose: dto.tuesdayClose,
      tuesdayIsWorking: dto.tuesdayIsWorking,
      wednesdayOpen: dto.wednesdayOpen,
      wednesdayClose: dto.wednesdayClose,
      wednesdayIsWorking: dto.wednesdayIsWorking,
      thursdayOpen: dto.thursdayOpen,
      thursdayClose: dto.thursdayClose,
      thursdayIsWorking: dto.thursdayIsWorking,
      fridayOpen: dto.fridayOpen,
      fridayClose: dto.fridayClose,
      fridayIsWorking: dto.fridayIsWorking,
      saturdayOpen: dto.saturdayOpen,
      saturdayClose: dto.saturdayClose,
      saturdayIsWorking: dto.saturdayIsWorking,
      sundayOpen: dto.sundayOpen,
      sundayClose: dto.sundayClose,
      sundayIsWorking: dto.sundayIsWorking,
      users: undefined,
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      ...(dto.networkId && {
        network: { connect: { id: dto.networkId } }
      })
    };

    return this.prisma.restaurant.update({
      where: { id: restaurantId },
      data,
      include: this.includeDetails
    });
  }

  async delete(restaurantId: string) {
    await this.getById(restaurantId);
    return this.prisma.restaurant.delete({
      where: { id: restaurantId }
    });
  }

  // ... rest of the methods remain unchanged
  async addUserToRestaurant(restaurantId: string, userId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: this.includeUsers
    });

    if (!restaurant) throw new NotFoundException('Ресторан не найден');

    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) throw new NotFoundException('Пользователь не найден');

    if (restaurant.users.some(u => u.id === userId)) {
      throw new ConflictException('Пользователь уже добавлен в ресторан ');
    }

    return this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        users: {
          connect: { id: userId }
        }
      },
      include: this.includeUsers
    });
  }

  async removeUserFromRestaurant(restaurantId: string, userId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: this.includeUsers
    });

    if (!restaurant) throw new NotFoundException('Ресторан не найден');

    if (!restaurant.users.some(u => u.id === userId)) {
      throw new ConflictException('Пользователь не найден');
    }

    return this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        users: {
          disconnect: { id: userId }
        }
      },
      include: this.includeUsers
    });
  }

  async getRestaurantUsers(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: this.includeUsers
    });

    if (!restaurant) throw new NotFoundException('Ресторан не найден');
    return restaurant.users;
  }

  async addProductToRestaurant(restaurantId: string, productId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: this.includeProducts,
    });

    if (!restaurant) throw new NotFoundException('Ресторан не найден');

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) throw new NotFoundException('Продукт не найден');

    if (restaurant.products.some(p => p.id === productId)) {
      throw new ConflictException('Продукт уже добавлен в ресторан');
    }

    return this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        products: {
          connect: { id: productId },
        },
      },
      include: this.includeProducts,
    });
  }

  async removeProductFromRestaurant(restaurantId: string, productId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: this.includeProducts,
    });

    if (!restaurant) throw new NotFoundException('Ресторан не найден');

    if (!restaurant.products.some(p => p.id === productId)) {
      throw new ConflictException('Продукт не найден в ресторане');
    }

    return this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        products: {
          disconnect: { id: productId },
        },
      },
      include: this.includeProducts,
    });
  }
async updateStockSettings(restaurantId: string, allowNegativeStock: boolean) {
    await this.getById(restaurantId);
    
    return this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: { allowNegativeStock },
      include: this.includeDetails
    });
  }

  async updateOrderSettings(restaurantId: string, acceptOrders: boolean) {
    await this.getById(restaurantId);
    
    return this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: { acceptOrders },
      include: this.includeDetails
    });
  }

  async canAcceptOrders(restaurantId: string): Promise<boolean> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { acceptOrders: true }
    });

    if (!restaurant) throw new NotFoundException('Ресторан не найден');
    return restaurant.acceptOrders;
  }

  async canHaveNegativeStock(restaurantId: string): Promise<boolean> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { allowNegativeStock: true }
    });

    if (!restaurant) throw new NotFoundException('Ресторан не найден');
    return restaurant.allowNegativeStock;
  }
  
  async getRestaurantProducts(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        products: {
          include: {
            category: true,
            additives: true,
            restaurantPrices: true,
          }
        }
      }
    });

    if (!restaurant) throw new NotFoundException('Ресторан не найден');
    return restaurant.products;
  }
}