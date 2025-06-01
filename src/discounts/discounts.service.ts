import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { Discount, Prisma, Order, DiscountType, DayOfWeek } from '@prisma/client';
import { DateTime } from 'luxon';

@Injectable()
export class DiscountsService {
  constructor(private prisma: PrismaService) {}

  async createDiscount(data: CreateDiscountDto): Promise<Discount> {
    const { restaurants, categories, products, daysOfWeek, ...discountData } = data;
 
    if (data.code) {
      const existingDiscount = await this.prisma.discount.findFirst({
        where: {  
          code: data.code 
        },
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
    const { restaurants, categories, products, ...discountData } = data;

    const discount = await this.prisma.discount.update({
      where: { id },
      data: discountData,
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

  private async validateDiscountConditions(discount: Discount, order: Order, customerId?: string): Promise<void> {
    const now = DateTime.now();
    
    if (discount.startDate && now < DateTime.fromJSDate(discount.startDate)) {
      throw new BadRequestException('Discount is not yet active');
    }

    if (discount.endDate && now > DateTime.fromJSDate(discount.endDate)) {
      throw new BadRequestException('Discount has expired');
    }

    if (discount.daysOfWeek.length > 0) {
      const currentDay = now.weekday; // Luxon возвращает 1-7 (понедельник=1)
      const dayOfWeek = this.mapLuxonWeekdayToDayOfWeek(currentDay);
      
      if (!discount.daysOfWeek.includes(dayOfWeek)) {
        throw new BadRequestException('Discount not valid for today');
      }
    }
    

    if (discount.minOrderAmount && order.totalAmount < discount.minOrderAmount) {
      throw new BadRequestException(`Minimum order amount for this discount is ${discount.minOrderAmount}`);
    }

    if (!discount.orderTypes.includes(order.type)) {
      throw new BadRequestException(`Discount not valid for order type ${order.type}`);
    }

    if (discount.code) {
      const promoCode = await this.prisma.promoCode.findFirst({
        where: { code: discount.code, customerId },
      });

      if (!promoCode || promoCode.used) {
        throw new BadRequestException('Invalid or used promo code');
      }
    }
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

  private async calculateDiscountAmount(
    discount: Discount,
    orderAmount: number,
    applicableProducts: string[]
  ): Promise<number> {
    if (discount.type === DiscountType.FIXED) {
      // For fixed discounts, the value is the exact amount to subtract
      return Math.min(discount.value, orderAmount);
    } else {
      // For percentage discounts, calculate the percentage of the order amount
      const discountAmount = (orderAmount * discount.value) / 100;
      
      if (applicableProducts.length > 0) {
        // If discount applies to specific products, calculate based on those products only
        const productPrices = await Promise.all(
          applicableProducts.map(productId => this.getProductPrice(productId))
        );
        
        const applicableAmount = productPrices.reduce(
          (sum, price) => sum + price,
          0
        );
        return (applicableAmount * discount.value) / 100;
      }
      
      return discountAmount;
    }
  }

  private async getProductPrice(productId: string): Promise<number> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    return product?.price || 0;
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
    await this.validateDiscountConditions(discount, order, customerId);

    const applicableProducts = await this.getApplicableProducts(discountId, order.items);
    const discountAmount = await this.calculateDiscountAmount(discount, order.totalAmount, applicableProducts);

    await this.prisma.discount.update({
      where: { id: discountId },
      data: { currentUses: { increment: 1 } },
    });

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        totalAmount: order.totalAmount - discountAmount,
        discountAmount,
      },
    });

    await this.prisma.discountApplication.create({
      data: {
        discountId,
        orderId,
        amount: discountAmount,
        description: `Applied discount ${discount.title}`,
      },
    });

    if (discount.code && customerId) {
      await this.prisma.promoCode.updateMany({
        where: { code: discount.code, customerId },
        data: { used: true },
      });
    }

    return { discountAmount, updatedOrder };
  }

  async generatePromoCode(discountId: string, customerId: string): Promise<string> {
    const discount = await this.findDiscountById(discountId);
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

  async getCustomerPromoCodes(customerId: string): Promise<any[]> {
    return this.prisma.promoCode.findMany({
      where: { customerId },
      include: { discount: true },
    });
  }
  
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
}