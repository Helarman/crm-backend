
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateDiscountDto, UpdateDiscountDto } from './dto';
import { Discount, DiscountTargetType, Prisma } from '@prisma/client';

@Injectable()
export class DiscountsService {
  constructor(private prisma: PrismaService) { }

  async createDiscount(dto: CreateDiscountDto): Promise<Discount> {
    // Валидация времени
    if (dto.startTime !== undefined && dto.endTime !== undefined) {
      if (dto.startTime < 0 || dto.startTime > 23 || dto.endTime < 0 || dto.endTime > 23) {
        throw new BadRequestException('Time must be between 0 and 23');
      }
      if (dto.startTime >= dto.endTime) {
        throw new BadRequestException('Start time must be before end time');
      }
    }

    // Валидация дат
    if (dto.startDate && dto.endDate && new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException('Start date must be before end date');
    }
    if (dto.minOrderAmount !== undefined && dto.maxOrderAmount !== undefined) {
      if (dto.minOrderAmount >= dto.maxOrderAmount) {
        throw new BadRequestException('Min order amount must be less than max order amount');
      }
    }
    // Проверка уникальности кода
    if (dto.code) {
      const existingDiscount = await this.prisma.discount.findFirst({
        where: { code: dto.code },
      });
      if (existingDiscount) {
        throw new BadRequestException('Discount with this code already exists');
      }
    }

    // Проверка существования сети, если указана
    if (dto.networkId) {
      const network = await this.prisma.network.findUnique({
        where: { id: dto.networkId },
      });
      if (!network) {
        throw new NotFoundException(`Network with ID ${dto.networkId} not found`);
      }
    }

    // Создание скидки
    return this.prisma.discount.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        value: dto.value,
        targetType: dto.targetType,
        minOrderAmount: dto.minOrderAmount,
        maxOrderAmount: dto.maxOrderAmount,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        startTime: dto.startTime,
        endTime: dto.endTime,
        isActive: dto.isActive,
        code: dto.code,
        maxUses: dto.maxUses,
        networkId: dto.networkId,
        restaurants: dto.restaurantIds && {
          createMany: {
            data: dto.restaurantIds.map(restaurantId => ({ restaurantId })),
          },
        },
        products: dto.productIds && {
          createMany: {
            data: dto.productIds.map(productId => ({ productId })),
          },
        },
      },
      include: this.getDiscountIncludes(),
    });
  }
  async findAllDiscounts(): Promise<Discount[]> {
    return this.prisma.discount.findMany({
      include: this.getDiscountIncludes(),
    });
  }

  async findDiscountById(id: string): Promise<Discount> {
    const discount = await this.prisma.discount.findUnique({
      where: { id },
      include: this.getDiscountIncludes(),
    });

    if (!discount) {
      throw new NotFoundException(`Discount with ID ${id} not found`);
    }

    return discount;
  }

  async updateDiscount(id: string, dto: UpdateDiscountDto): Promise<Discount> {
    const existingDiscount = await this.findDiscountById(id);

    // Валидация времени
    if (dto.startTime !== undefined && dto.endTime !== undefined) {
      if (dto.startTime < 0 || dto.startTime > 23 || dto.endTime < 0 || dto.endTime > 23) {
        throw new BadRequestException('Time must be between 0 and 23');
      }
      if (dto.startTime >= dto.endTime) {
        throw new BadRequestException('Start time must be before end time');
      }
    }

    if (dto.minOrderAmount !== undefined && dto.maxOrderAmount !== undefined) {
      if (dto.minOrderAmount >= dto.maxOrderAmount) {
        throw new BadRequestException('Min order amount must be less than max order amount');
      }
    }

    // Валидация дат
    if (dto.startDate && dto.endDate && new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Обновление скидки
    const updateData: Prisma.DiscountUpdateInput = {
      title: dto.title,
      description: dto.description,
      type: dto.type,
      value: dto.value,
      targetType: dto.targetType,
      minOrderAmount: dto.minOrderAmount,
      maxOrderAmount: dto.maxOrderAmount,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      startTime: dto.startTime,
      endTime: dto.endTime,
      isActive: dto.isActive,
      code: dto.code,
      maxUses: dto.maxUses,
    };

    // Обновляем скидку
    const updatedDiscount = await this.prisma.discount.update({
      where: { id },
      data: updateData,
      include: this.getDiscountIncludes(),
    });

    // Обновляем связи с ресторанами и продуктами, если они предоставлены
    if (dto.restaurantIds || dto.productIds) {
      await this.prisma.$transaction([
        // Удаляем старые связи
        this.prisma.restaurantDiscount.deleteMany({ where: { discountId: id } }),
        this.prisma.productDiscount.deleteMany({ where: { discountId: id } }),

        // Создаем новые связи
        dto.restaurantIds && this.prisma.restaurantDiscount.createMany({
          data: dto.restaurantIds.map(restaurantId => ({ discountId: id, restaurantId })),
        }),
        dto.productIds && this.prisma.productDiscount.createMany({
          data: dto.productIds.map(productId => ({ discountId: id, productId })),
        }),
      ].filter(Boolean) as Prisma.PrismaPromise<any>[]);
    }

    return this.findDiscountById(id);
  }

  async deleteDiscount(id: string): Promise<Discount> {
    const discount = await this.findDiscountById(id);

    return this.prisma.$transaction(async (prisma) => {
      // 1. First delete all related restaurant associations
      await prisma.restaurantDiscount.deleteMany({
        where: { discountId: id }
      });

      // 2. Delete all related product associations
      await prisma.productDiscount.deleteMany({
        where: { discountId: id }
      });

      // 3. Delete all discount applications
      await prisma.discountApplication.deleteMany({
        where: { discountId: id }
      });

      // 4. Delete all related promo codes
      await prisma.promoCode.deleteMany({
        where: { discountId: id }
      });

      // 5. Finally delete the discount itself
      return prisma.discount.delete({
        where: { id },
        include: this.getDiscountIncludes(),
      });
    });
  }


  async findDiscountsByRestaurant(restaurantId: string): Promise<Discount[]> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${restaurantId} not found`);
    }

    return this.prisma.discount.findMany({
      where: {
        restaurants: {
          some: { restaurantId }
        },
        isActive: true,
        code: null,
      },
      include: this.getDiscountIncludes(),
    });
  }

  async findDiscountsByProduct(productId: string): Promise<Discount[]> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return this.prisma.discount.findMany({
      where: {
        products: {
          some: { productId }
        },
        isActive: true,
      },
      include: this.getDiscountIncludes(),
    });
  }

  async findDiscountsByProducts(productIds: string[]): Promise<Discount[]> {
    if (!productIds || productIds.length === 0) {
      throw new BadRequestException('Product IDs array is empty');
    }

    // Проверяем существование продуктов
    const productsCount = await this.prisma.product.count({
      where: { id: { in: productIds } },
    });

    if (productsCount !== productIds.length) {
      throw new NotFoundException('Some products not found');
    }

    return this.prisma.discount.findMany({
      where: {
        products: {
          some: { productId: { in: productIds } }
        },
        isActive: true,
      },
      include: this.getDiscountIncludes(),
    });
  }

  async findDiscountByPromoCode(code: string): Promise<Discount> {
    const discount = await this.prisma.discount.findFirst({
      where: {
        code,
        isActive: true,
        // Проверяем даты действия
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: new Date() } }] },
          { OR: [{ endDate: null }, { endDate: { gte: new Date() } }] }
        ]
      },
      include: this.getDiscountIncludes(),
    });

    if (!discount) {
      throw new NotFoundException(`Active discount with code ${code} not found`);
    }

    return discount;
  }
  async validateDiscount(discountId: string, restaurantId: string, currentAmount: number): Promise<Discount> {
    const discount = await this.prisma.discount.findUnique({
      where: { id: discountId },
      include: {
        restaurants: { where: { restaurantId } }
      }
    });

    if (!discount) {
      throw new NotFoundException('Скидка не найдена');
    }

    if (!discount.isActive) {
      throw new BadRequestException('Скидка не активна');
    }

    // Проверка доступности для ресторана
    if (discount.restaurants.length === 0 && discount.targetType !== 'ALL') {
      throw new BadRequestException('Скидка не доступна для этого ресторана');
    }

    // Проверка минимальной суммы
    if (discount.minOrderAmount && currentAmount < discount.minOrderAmount) {
      throw new BadRequestException(
        `Минимальная сумма заказа для скидки: ${discount.minOrderAmount}`
      );
    }

    if (discount.minOrderAmount && currentAmount < discount.minOrderAmount) {
      throw new BadRequestException(
        `Минимальная сумма заказа для скидки: ${discount.minOrderAmount}`
      );
    }

    if (discount.maxOrderAmount && currentAmount > discount.maxOrderAmount) {
      throw new BadRequestException(
        `Максимальная сумма заказа для скидки: ${discount.maxOrderAmount}`
      );
    }

    // Проверка дат действия
    const now = new Date();
    if (discount.startDate && new Date(discount.startDate) > now) {
      throw new BadRequestException('Скидка еще не началась');
    }

    if (discount.endDate && new Date(discount.endDate) < now) {
      throw new BadRequestException('Скидка уже закончилась');
    }

    // Проверка времени суток
    if (discount.startTime !== null && discount.endTime !== null) {
      const currentHour = now.getHours();
      if (currentHour < discount.startTime || currentHour >= discount.endTime) {
        throw new BadRequestException(
          `Скидка доступна с ${discount.startTime}:00 до ${discount.endTime}:00`
        );
      }
    }

    // Проверка лимита использований
    if (discount.maxUses && discount.currentUses >= discount.maxUses) {
      throw new BadRequestException('Лимит использований скидки исчерпан');
    }

    return discount;
  }

  async calculateDiscountAmount(
    discount: Discount,
    orderItems: Array<{
      productId: string;
      price: number;
      quantity: number;
      isRefund: boolean;
    }>
  ): Promise<{ amount: number; description: string }> {
    let discountAmount = 0;
    let description = '';

    if (discount.targetType === DiscountTargetType.PRODUCT) {
      // Получаем продукты, на которые действует скидка
      const productDiscounts = await this.prisma.productDiscount.findMany({
        where: { discountId: discount.id },
        include: { product: true }
      });

      const productIds = productDiscounts.map(pd => pd.productId);
      const applicableItems = orderItems.filter(
        item => productIds.includes(item.productId) && !item.isRefund
      );

      for (const item of applicableItems) {
        const itemDiscount = discount.type === 'PERCENTAGE'
          ? Math.floor((item.price * item.quantity * discount.value) / 100)
          : discount.value * item.quantity;

        discountAmount += itemDiscount;
      }

      description = `Скидка "${discount.title}" применена к ${applicableItems.length} позициям`;
    } else {
      // Скидка на весь заказ
      const subtotal = orderItems
        .filter(item => !item.isRefund)
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);

      discountAmount = discount.type === 'PERCENTAGE'
        ? Math.floor((subtotal * discount.value) / 100)
        : discount.value;

      description = `Скидка "${discount.title}" применена ко всему заказу`;
    }

    if (discountAmount <= 0) {
      throw new BadRequestException('Сумма скидки должна быть больше 0');
    }

    return { amount: discountAmount, description };
  }

  async findDiscountsByNetwork(networkId: string, options?: {
    includeInactive?: boolean;
    onlyActive?: boolean;
  }): Promise<Discount[]> {
    const network = await this.prisma.network.findUnique({
      where: { id: networkId },
    });

    if (!network) {
      throw new NotFoundException(`Network with ID ${networkId} not found`);
    }

    const where: Prisma.DiscountWhereInput = {
      networkId,
    };

    // Фильтрация по активности
    if (options?.onlyActive || !options?.includeInactive) {
      where.isActive = true;

      // Фильтрация по датам действия
      const now = new Date();
      where.AND = [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
      ];
    }

    return this.prisma.discount.findMany({
      where,
      include: this.getDiscountIncludes(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAvailableDiscountsForNetwork(
    networkId: string,
    options?: {
      includeCodeDiscounts?: boolean;
      targetType?: DiscountTargetType;
      orderType?: string;
      minAmount?: number;
      maxAmount?: number;
    }
  ): Promise<Discount[]> {
    const network = await this.prisma.network.findUnique({
      where: { id: networkId },
      include: { restaurants: true },
    });

    if (!network) {
      throw new NotFoundException(`Network with ID ${networkId} not found`);
    }

    const now = new Date();
    const currentHour = now.getHours();

    const where: Prisma.DiscountWhereInput = {
      networkId,
      isActive: true,
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
      ],
    };

    // Фильтрация по наличию кода
    if (!options?.includeCodeDiscounts) {
      where.code = null;
    }

    // Фильтрация по типу скидки
    if (options?.targetType) {
      where.targetType = options.targetType;
    }

    // Фильтрация по времени суток
    where.AND = [
      ...(where.AND as Prisma.DiscountWhereInput[]),
      {
        OR: [
          { startTime: null, endTime: null },
          {
            AND: [
              { startTime: { lte: currentHour } },
              { endTime: { gt: currentHour } }
            ]
          }
        ]
      }
    ];

    // Фильтрация по минимальной сумме
    if (options?.minAmount) {
      where.OR = [
        { minOrderAmount: null },
        { minOrderAmount: { lte: options.minAmount } }
      ];
    }

    if (options?.maxAmount) {
      where.OR = [
        ...(where.OR as Prisma.DiscountWhereInput[] || []),
        { maxOrderAmount: null },
        { maxOrderAmount: { gte: options.maxAmount } }
      ];
    }

    return this.prisma.discount.findMany({
      where,
      include: this.getDiscountIncludes(),
      orderBy: [
        { targetType: 'asc' },
        { createdAt: 'desc' }
      ],
    });
  }

  async findDiscountsByNetworkAndRestaurant(
    networkId: string,
    restaurantId: string
  ): Promise<Discount[]> {
    const [network, restaurant] = await Promise.all([
      this.prisma.network.findUnique({ where: { id: networkId } }),
      this.prisma.restaurant.findUnique({
        where: { id: restaurantId },
        include: { network: true }
      }),
    ]);

    if (!network) {
      throw new NotFoundException(`Network with ID ${networkId} not found`);
    }

    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${restaurantId} not found`);
    }

    // Проверяем, что ресторан принадлежит сети
    if (restaurant.networkId !== networkId) {
      throw new BadRequestException('Restaurant does not belong to the specified network');
    }

    const now = new Date();
    const currentHour = now.getHours();

    return this.prisma.discount.findMany({
      where: {
        OR: [
          // Скидки, привязанные к сети (доступны всем ресторанам сети)
          {
            networkId,
            restaurants: {
              none: {}
            },
            isActive: true,
            AND: [
              { OR: [{ startDate: null }, { startDate: { lte: now } }] },
              { OR: [{ endDate: null }, { endDate: { gte: now } }] },
              {
                OR: [
                  { startTime: null, endTime: null },
                  {
                    AND: [
                      { startTime: { lte: currentHour } },
                      { endTime: { gt: currentHour } }
                    ]
                  }
                ]
              }
            ]
          },
          // Скидки, привязанные конкретно к этому ресторану
          {
            restaurants: {
              some: { restaurantId }
            },
            isActive: true,
            AND: [
              { OR: [{ startDate: null }, { startDate: { lte: now } }] },
              { OR: [{ endDate: null }, { endDate: { gte: now } }] },
              {
                OR: [
                  { startTime: null, endTime: null },
                  {
                    AND: [
                      { startTime: { lte: currentHour } },
                      { endTime: { gt: currentHour } }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      include: this.getDiscountIncludes(),
      orderBy: [
        { targetType: 'asc' },
        { createdAt: 'desc' }
      ],
    });
  }

  private getDiscountIncludes() {
    return {
      network: true,
      restaurants: {
        include: {
          restaurant: true
        }
      },
      products: {
        include: {
          product: true
        }
      },
    };
  }
}