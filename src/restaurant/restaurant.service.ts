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
	  ) {}
  
	private includeUsers = {
	  users: true
	};

	private readonly includeProducts = {
		products: true,
	};
	
	
	async getAll() {
	  return this.prisma.restaurant.findMany({
		include: this.includeUsers
	  });
	}
  
	async getById(restaurantId: string) {
	  const restaurant = await this.prisma.restaurant.findUnique({
		where: { id: restaurantId },
		include: this.includeUsers
	  });
  
	  if (!restaurant) throw new NotFoundException('Ресторан не найден');
	  return restaurant;
	}
  
	async create(dto: CreateRestaurantDto) {
	  return this.prisma.restaurant.create({
		data: dto,
		include: this.includeUsers
	  });
	}
  
	async update(restaurantId: string, dto: UpdateRestaurantDto) {
		await this.getById(restaurantId);
		
		return this.prisma.restaurant.update({
			where: { id: restaurantId },
			data: {
			...dto,
			 users: undefined ,
			id: undefined,
			createdAt: undefined,
			updatedAt: undefined,
			}
		});
		}
		
	async delete(restaurantId: string) {
	  await this.getById(restaurantId);
	  return this.prisma.restaurant.delete({
		where: { id: restaurantId }
	  });
	}
  
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
	
	  async getRestaurantProducts(restaurantId: string) {
		const restaurant = await this.prisma.restaurant.findUnique({
		  where: { id: restaurantId },
		  include: {
			products: {
				include:{
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