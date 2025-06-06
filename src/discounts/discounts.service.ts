import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { Discount, Prisma, Order, DiscountType, DayOfWeek, PromoCode } from '@prisma/client';
import { DateTime } from 'luxon';

@Injectable()
export class DiscountsService {
  constructor(private prisma: PrismaService) {}

  // ==================== CRUD Operations ====================

  async createDiscount(data: CreateDiscountDto): Promise<Discount> {
    const { restaurants, categories, products, daysOfWeek, ...discountData } = data;
 
    if (data.code) {
      const existingDiscount = await this.prisma.discount.findFirst({
        where: { code: data.code },
      });
      if (existingDiscount) {
        throw new BadRequestException('Discount with this code already exists');
      }
    }

    const mappedDays = daysOfWeek?.map(day => 
      typeof day === 'number' ? this.mapDayNumberToDayOfWeek(day) : day
    ) || [];

    const discount = await this.prisma.discount.create({
      data: {
        ...discountData,
        daysOfWeek: mappedDays,
        restaurants: restaurants && {
          createMany: {
            data: restaurants.map(r => ({ restaurantId: r.restaurantId })),
          },
        },
        categories: categories && {
          createMany: {
            data: categories.map(c => ({ categoryId: c.categoryId })),
          },
        },
        products: products && {
          createMany: {
            data: products.map(p => ({ productId: p.productId })),
          },
        },
      },
    });

    return discount;
  }

  async findAllDiscounts(): Promise<Discount[]> {
    return this.prisma.discount.findMany({
      include: {
        restaurants: { include: { restaurant: true } },
        categories: { include: { category: true } },
        products: { include: { product: true } },
      },
    });
  }

  async findDiscountById(id: string): Promise<Discount> {
    const discount = await this.prisma.discount.findUnique({
      where: { id },
      include: {
        restaurants: { include: { restaurant: true } },
        categories: { include: { category: true } },
        products: { include: { product: true } },
      },
    });

    if (!discount) {
      throw new NotFoundException(`Discount with ID ${id} not found`);
    }

    return discount;
  }

  async updateDiscount(id: string, data: UpdateDiscountDto): Promise<Discount> {
    const { restaurants, categories, products, daysOfWeek, ...discountData } = data;

    const mappedDays = daysOfWeek?.map(day => 
      typeof day === 'number' ? this.mapDayNumberToDayOfWeek(day) : day
    ) || [];

    const discount = await this.prisma.discount.update({
      where: { id },
      data: {
        ...discountData,
        daysOfWeek: mappedDays
      }
    });

    if (restaurants || categories || products) {
      await this.prisma.$transaction([
        this.prisma.restaurantDiscount.deleteMany({ where: { discountId: id } }),
        this.prisma.categoryDiscount.deleteMany({ where: { discountId: id } }),
        this.prisma.productDiscount.deleteMany({ where: { discountId: id } }),

        restaurants && this.prisma.restaurantDiscount.createMany({
          data: restaurants.map(r => ({ discountId: id, restaurantId: r.restaurantId })),
        }),
        categories && this.prisma.categoryDiscount.createMany({
          data: categories.map(c => ({ discountId: id, categoryId: c.categoryId })),
        }),
        products && this.prisma.productDiscount.createMany({
          data: products.map(p => ({ discountId: id, productId: p.productId })),
        }),
      ].filter(Boolean) as Prisma.PrismaPromise<any>[]);
    }

    return this.findDiscountById(id);
  }

  async deleteDiscount(id: string): Promise<Discount> {
    return this.prisma.discount.delete({
      where: { id },
    });
  }

  // ==================== Discount Application ====================

  async applyDiscountToOrder(
    orderId: string,
    discountId: string,
    customerId?: string
  ): Promise<{ discountAmount: number; updatedOrder: Order }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const discount = await this.findDiscountById(discountId);
    
    const validation = await this.validateDiscount(
      discountId,
      order.totalAmount,
      customerId
    );
    
    if (!validation.isValid) {
      throw new BadRequestException(validation.message || 'Discount cannot be applied');
    }

    const applicableProducts = await this.getApplicableProducts(discountId, order.items);
    const discountAmount = await this.calculateDiscountAmount(discount, order.totalAmount, applicableProducts);

    const [updatedOrder] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          totalAmount: order.totalAmount - discountAmount,
          discountAmount,
        },
      }),
      this.prisma.discount.update({
        where: { id: discountId },
        data: { currentUses: { increment: 1 } },
      }),
      this.prisma.discountApplication.create({
        data: {
          discountId,
          orderId,
          amount: discountAmount,
          description: `Applied discount ${discount.title}`,
        },
      }),
      ...(discount.code && customerId ? [
        this.prisma.promoCode.updateMany({
          where: { code: discount.code, customerId },
          data: { used: true },
        })
      ] : [])
    ]);

    return { discountAmount, updatedOrder };
  }

  // ==================== Discount Discovery ====================

  async findDiscountByCode(code: string): Promise<Discount> {
    const discount = await this.prisma.discount.findFirst({
      where: { code },
      include: {
        restaurants: { include: { restaurant: true } },
        categories: { include: { category: true } },
        products: { include: { product: true } },
      },
    });

    if (!discount) {
      throw new NotFoundException(`Discount with code ${code} not found`);
    }

    return discount;
  }

  async findActiveDiscounts(): Promise<Discount[]> {
    const now = new Date();
    return this.prisma.discount.findMany({
      where: {
        isActive: true,
        OR: [
          { startDate: { lte: now }, endDate: null },
          { startDate: { lte: now }, endDate: { gte: now } },
          { startDate: null, endDate: { gte: now } },
          { startDate: null, endDate: null }
        ]
      },
      include: {
        restaurants: { include: { restaurant: true } },
        categories: { include: { category: true } },
        products: { include: { product: true } },
      },
    });
  }

  async findDiscountsByRestaurant(restaurantId: string): Promise<Discount[]> {
    return this.prisma.discount.findMany({
      where: {
        restaurants: { some: { restaurantId } },
        isActive: true
      },
      include: {
        restaurants: { include: { restaurant: true } },
        categories: { include: { category: true } },
        products: { include: { product: true } },
      },
    });
  }

  async findDiscountsForProducts(productIds: string[]): Promise<Discount[]> {
    return this.prisma.discount.findMany({
      where: {
        OR: [
          { targetType: 'ALL' },
          {
            targetType: 'PRODUCT',
            products: { some: { productId: { in: productIds } } }
          },
          {
            targetType: 'CATEGORY',
            categories: {
              some: {
                category: { products: { some: { id: { in: productIds } } } }
              }
            }
          }
        ],
        isActive: true
      },
      include: {
        restaurants: { include: { restaurant: true } },
        categories: { include: { category: true } },
        products: { include: { product: true } },
      },
    });
  }

  async findDiscountsForCategories(categoryIds: string[]): Promise<Discount[]> {
    return this.prisma.discount.findMany({
      where: {
        OR: [
          { targetType: 'ALL' },
          {
            targetType: 'CATEGORY',
            categories: { some: { categoryId: { in: categoryIds } } }
          }
        ],
        isActive: true
      },
      include: {
        restaurants: { include: { restaurant: true } },
        categories: { include: { category: true } },
        products: { include: { product: true } },
      },
    });
  }

  async findDiscountsForOrderType(
    orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'BANQUET',
    restaurantId?: string
  ): Promise<Discount[]> {
    const now = new Date();
    
    const where: Prisma.DiscountWhereInput = {
      isActive: true,
      orderTypes: { has: orderType },
      OR: [
        { startDate: { lte: now }, endDate: { gte: now } },
        { startDate: null, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: null },
        { startDate: null, endDate: null }
      ]
    };

    if (restaurantId) {
      where.OR = [
        { targetType: 'ALL' },
        { 
          targetType: 'RESTAURANT',
          restaurants: { some: { restaurantId } }
        }
      ];
    }

    return this.prisma.discount.findMany({
      where,
      include: {
        restaurants: { include: { restaurant: true } },
        categories: { include: { category: true } },
        products: { include: { product: true } },
      },
    });
  }

  async findDiscountsForCurrentOrder(
    orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'BANQUET',
    productIds: string[],
    categoryIds: string[],
    restaurantId?: string
  ): Promise<Discount[]> {
    const now = new Date();

    const baseWhere: Prisma.DiscountWhereInput = {
      isActive: true,
      orderTypes: { has: orderType },
      OR: [
        { startDate: { lte: now }, endDate: { gte: now } },
        { startDate: null, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: null },
        { startDate: null, endDate: null }
      ]
    };

    const [productDiscounts, categoryDiscounts, restaurantDiscounts, allDiscounts] = await Promise.all([
      this.prisma.discount.findMany({
        where: {
          ...baseWhere,
          OR: [
            { targetType: 'PRODUCT', products: { some: { productId: { in: productIds } } } },
            { 
              targetType: 'CATEGORY', 
              categories: { 
                some: { 
                  category: { 
                    products: { 
                      some: { id: { in: productIds } } 
                    } 
                  } 
                } 
              } 
            }
          ]
        },
        
        include: {
          restaurants: { include: { restaurant: true } },
          categories: { include: { category: true } },
          products: { include: { product: true } },
        },
      }),
      this.prisma.discount.findMany({
        where: {
          ...baseWhere,
          targetType: 'CATEGORY',
          categories: { some: { categoryId: { in: categoryIds } }}
        },
        include: {
          restaurants: { include: { restaurant: true } },
          categories: { include: { category: true } },
          products: { include: { product: true } },
        },
      }),
      
      restaurantId ? this.prisma.discount.findMany({
        where: {
          ...baseWhere,
          targetType: 'RESTAURANT',
          restaurants: { some: { restaurantId } }
        },
        include: {
          restaurants: { include: { restaurant: true } },
          categories: { include: { category: true } },
          products: { include: { product: true } },
        },
      }) : Promise.resolve([]),
      
      this.prisma.discount.findMany({
        where: {
          ...baseWhere,
          targetType: 'ALL'
        },
        include: {
          restaurants: { include: { restaurant: true } },
          categories: { include: { category: true } },
          products: { include: { product: true } },
        },
      })
    ]);

    const allResults = [...productDiscounts, ...categoryDiscounts, ...restaurantDiscounts, ...allDiscounts];
    const uniqueDiscounts = allResults.filter(
      (discount, index, self) => index === self.findIndex(d => d.id === discount.id)
    );

    return uniqueDiscounts;
  }

  // ==================== Discount Validation ====================

  async validateDiscount(
    discountId: string,
    amount?: number,
    customerId?: string
  ): Promise<{ isValid: boolean; message?: string }> {
    const discount = await this.findDiscountById(discountId);
    const now = DateTime.now();
    
    const validations = {
      isActive: discount.isActive,
      dateValid: (!discount.startDate || now >= DateTime.fromJSDate(discount.startDate)) && 
                 (!discount.endDate || now <= DateTime.fromJSDate(discount.endDate)),
      minAmountValid: !discount.minOrderAmount || 
                     (amount && amount >= discount.minOrderAmount),
      usesValid: !discount.maxUses || discount.currentUses < discount.maxUses,
      dayValid: discount.daysOfWeek.length === 0 || 
                discount.daysOfWeek.includes(this.mapLuxonWeekdayToDayOfWeek(now.weekday)),
      promoValid: !discount.code || await this.validatePromoCode(discount.code, customerId)
    };

    const isValid = Object.values(validations).every(Boolean);
    
    let message: string | undefined;
    if (!isValid) {
      if (!validations.isActive) message = 'Discount is not active';
      else if (!validations.dateValid) {
        if (discount.startDate && now < DateTime.fromJSDate(discount.startDate)) {
          message = 'Discount is not yet available';
        } else {
          message = 'Discount has expired';
        }
      }
      else if (!validations.minAmountValid) {
        message = `Minimum order amount is ${discount.minOrderAmount}`;
      }
      else if (!validations.usesValid) {
        message = 'Discount limit reached';
      }
      else if (!validations.dayValid) {
        message = 'Discount not valid for today';
      }
      else if (!validations.promoValid) {
        message = 'Invalid or used promo code';
      }
    }

    return { isValid, message };
  }

  private async validatePromoCode(code: string, customerId?: string): Promise<boolean> {
    if (!customerId) return false;
    
    const promoCode = await this.prisma.promoCode.findFirst({
      where: { code, customerId },
    });

    return !!promoCode && !promoCode.used;
  }

  async checkMinOrderAmount(discountId: string, amount: number): Promise<boolean> {
    const discount = await this.prisma.discount.findUnique({
      where: { id: discountId },
      select: { minOrderAmount: true }
    });

    if (!discount) {
      throw new NotFoundException(`Discount with ID ${discountId} not found`);
    }

    return !discount.minOrderAmount || amount >= discount.minOrderAmount;
  }

  // ==================== Promo Codes ====================

  async generatePromoCode(discountId: string, customerId: string): Promise<string> {
    const discount = await this.findDiscountById(discountId);
    
    if (!discount.code) {
      throw new BadRequestException('This discount does not support promo codes');
    }

    const existingCode = await this.prisma.promoCode.findFirst({
      where: { 
        discountId,
        customerId,
        used: false
      }
    });

    if (existingCode) {
      return existingCode.code;
    }

    const code = `PROMO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    await this.prisma.promoCode.create({
      data: {
        code,
        customerId,
        discountId,
      },
    });

    return code;
  }

  async getCustomerPromoCodes(customerId: string): Promise<PromoCode[]> {
    return this.prisma.promoCode.findMany({
      where: { customerId },
      include: { discount: true }
    });
  }

  // ==================== Product-specific Discounts ====================

  async getApplicableDiscountsForProduct(
    productId: string,
    orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'BANQUET',
    restaurantId?: string
  ): Promise<Discount[]> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return this.findDiscountsForCurrentOrder(
      orderType,
      [productId],
      product.category ? [product.category.id] : [],
      restaurantId
    );
  }

  async getBestDiscountForOrder(
    orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'BANQUET',
    productIds: string[],
    categoryIds: string[],
    restaurantId?: string,
    amount?: number
  ): Promise<{ discount: Discount | null; amount: number }> {
    const discounts = await this.findDiscountsForCurrentOrder(
      orderType,
      productIds,
      categoryIds,
      restaurantId
    );

    if (discounts.length === 0) {
      return { discount: null, amount: 0 };
    }

    const applicableDiscounts = amount 
      ? discounts.filter(d => !d.minOrderAmount || amount >= d.minOrderAmount)
      : discounts;

    if (applicableDiscounts.length === 0) {
      return { discount: null, amount: 0 };
    }

    const sortedDiscounts = [...applicableDiscounts].sort((a, b) => {
      if (a.type === 'FIXED' && b.type === 'FIXED') {
        return b.value - a.value;
      }
      if (a.type === 'PERCENTAGE' && b.type === 'PERCENTAGE') {
        return b.value - a.value;
      }
      return a.type === 'FIXED' ? -1 : 1;
    });

    const bestDiscount = sortedDiscounts[0];
    const discountAmount = amount 
      ? await this.calculateDiscountAmount(bestDiscount, amount, productIds)
      : 0;

    return { discount: bestDiscount, amount: discountAmount };
  }

  // ==================== Helper Methods ====================

  private async calculateDiscountAmount(
    discount: Discount,
    orderAmount: number,
    applicableProducts: string[]
  ): Promise<number> {
    if (discount.type === DiscountType.FIXED) {
      return Math.min(discount.value, orderAmount);
    }

    let amountToDiscount = orderAmount;
    
    if (applicableProducts.length > 0) {
      const productPrices = await this.prisma.product.findMany({
        where: { id: { in: applicableProducts } },
        select: { price: true },
      });
      
      amountToDiscount = productPrices.reduce(
        (sum, product) => sum + product.price,
        0
      );
    }

    const discountAmount = (amountToDiscount * discount.value) / 100;
    
    
    return discountAmount;
  }

  private async getApplicableProducts(discountId: string, orderItems: { productId: string }[]): Promise<string[]> {
    const productDiscounts = await this.prisma.productDiscount.findMany({
      where: { discountId },
    });

    if (productDiscounts.length === 0) return [];

    return orderItems
      .map(item => item.productId)
      .filter(productId => productDiscounts.some(pd => pd.productId === productId));
  }

  private mapDayNumberToDayOfWeek(dayNumber: number): DayOfWeek {
    const days = [
      DayOfWeek.SUNDAY,    // 0
      DayOfWeek.MONDAY,    // 1
      DayOfWeek.TUESDAY,   // 2
      DayOfWeek.WEDNESDAY, // 3
      DayOfWeek.THURSDAY,  // 4
      DayOfWeek.FRIDAY,    // 5
      DayOfWeek.SATURDAY   // 6
    ];
    return days[dayNumber];
  }

  private mapLuxonWeekdayToDayOfWeek(luxonWeekday: number): DayOfWeek {
    switch(luxonWeekday) {
      case 1: return DayOfWeek.MONDAY;
      case 2: return DayOfWeek.TUESDAY;
      case 3: return DayOfWeek.WEDNESDAY;
      case 4: return DayOfWeek.THURSDAY;
      case 5: return DayOfWeek.FRIDAY;
      case 6: return DayOfWeek.SATURDAY;
      case 7: return DayOfWeek.SUNDAY;
      default: throw new Error('Invalid weekday number');
    }
  }
}