import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService
  ) {}

  private generateRandomCode(length: number = 6): string {
    return Math.floor(Math.pow(10, length-1) + Math.random() * 9 * Math.pow(10, length-1)).toString();
  }

  private normalizePhone(phone: string): string {
    const normalized = phone.replace(/\D/g, '');
    if (normalized.length < 10) {
      throw new BadRequestException('Номер телефона должен содержать не менее 10 цифр');
    }
    return normalized;
  }

  private issueTokens(customerId: string) {
    const data = { id: customerId };

    const accessToken = this.jwtService.sign(data, {
      expiresIn: this.config.get('JWT_ACCESS_EXPIRATION') || '1h'
    });

    const refreshToken = this.jwtService.sign(data, {
      expiresIn: this.config.get('JWT_REFRESH_EXPIRATION') || '7d'
    });

    return { accessToken, refreshToken };
  }

  async requestCode(phone: string, networkId: string) {
    const normalizedPhone = this.normalizePhone(phone);
    const code = this.generateRandomCode();
    const expiresInMinutes = this.config.get<number>('CODE_EXPIRATION_MINUTES', 5);
    const codeExpires = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    // Проверяем существование сети
    const network = await this.prisma.network.findUnique({
      where: { id: networkId }
    });

    if (!network) {
      throw new NotFoundException('Сеть не найдена');
    }

    // Создаем или обновляем клиента в рамках сети
    await this.prisma.customer.upsert({
      where: { 
        phone_networkId: {
          phone: normalizedPhone,
          networkId
        }
      },
      create: { 
        phone: normalizedPhone,
        networkId,
        code, 
        codeExpires 
      },
      update: { 
        code, 
        codeExpires 
      },
    });

    console.log(`Код для ${normalizedPhone} в сети ${networkId}: ${code}`);
    return { success: true };
  }

  async verifyCode(phone: string, code: string, networkId: string) {
    const normalizedPhone = this.normalizePhone(phone);
    
    const customer = await this.prisma.customer.findUnique({
      where: { 
        phone_networkId: {
          phone: normalizedPhone,
          networkId
        }
      },
    });

    if (!customer || customer.code !== code) {
      throw new BadRequestException('Неправильный код');
    }

    if (customer.codeExpires && customer.codeExpires < new Date()) {
      throw new BadRequestException('Код истек');
    }

    await this.prisma.customer.update({
      where: { 
        phone_networkId: {
          phone: normalizedPhone,
          networkId
        }
      },
      data: { 
        code: null, 
        codeExpires: null,
        lastLogin: new Date()
      },
    });

    const tokens = this.issueTokens(customer.id);

    return {
      isValid: true,
      tokens,
      customer: {
        id: customer.id,
        phone: customer.phone,
        networkId: customer.networkId,
      }
    };
  }

  async getCustomerByPhone(phone: string, networkId: string) {
    const normalizedPhone = this.normalizePhone(phone);
    const customer = await this.prisma.customer.findUnique({
      where: { 
        phone_networkId: {
          phone: normalizedPhone,
          networkId
        }
      },
      select: {
        id: true,
        phone: true,
        networkId: true,
        createdAt: true,
        lastLogin: true,
      }
    });

    if (!customer) {
      throw new NotFoundException('Клиент не найден');
    }

    return customer;
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);
      const customer = await this.prisma.customer.findUnique({
        where: { id: payload.id },
      });

      if (!customer) {
        throw new UnauthorizedException('Клиент не найден');
      }

      return this.issueTokens(customer.id);
    } catch (e) {
      throw new UnauthorizedException('Невалидный refresh токен');
    }
  }


 // Метод для поиска клиента в любой сети (админский)
  async findCustomerInAnyNetwork(phone: string) {
    const normalizedPhone = this.normalizePhone(phone);
    const customers = await this.prisma.customer.findMany({
      where: { phone: normalizedPhone },
      include: {
        network: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: { lastLogin: 'desc' }
    });

    if (customers.length === 0) {
      throw new NotFoundException('Клиент не найден');
    }

    return customers;
  }

  // Получение всех клиентов в конкретной сети
  async getAllCustomers(networkId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const maxLimit = 100;
    const take = Math.min(limit, maxLimit);
    
    const [customers, totalCount] = await Promise.all([
      this.prisma.customer.findMany({
        where: { networkId },
        skip,
        take,
        select: {
          id: true,
          phone: true,
          networkId: true,
          createdAt: true,
          lastLogin: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.customer.count({ where: { networkId } }),
    ]);

    return {
      data: customers,
      pagination: {
        total: totalCount,
        page,
        limit: take,
        totalPages: Math.ceil(totalCount / take),
      },
    };
  }

  private generateShortCode(): string {
    const digits = '0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return result;
  }

async generateNewShortCode(customerId: string) {
  const shortCode = this.generateShortCode();
  const shortCodeExpires = new Date(Date.now() + 2 * 60 * 1000); // 2 минуты

  const customer = await this.prisma.customer.update({
    where: { id: customerId },
    data: { 
      shortCode,
      shortCodeExpires
    },
    select: {
      id: true,
      shortCode: true,
      shortCodeExpires: true
    }
  });

  return customer;
}


async getCustomerByShortCode(shortCode: string) {
  const customer = await this.prisma.customer.findFirst({
    where: { 
      shortCode,
      shortCodeExpires: { gt: new Date() }
    },
    select: {
      id: true,
      phone: true,
      createdAt: true,
      lastLogin: true,
    }
  });

  if (!customer) {
    throw new NotFoundException('Код не найден или истек');
  }

  return customer;
}
  async getPersonalDiscount(customerId: string, restaurantId: string) {
    const discount = await this.prisma.personalDiscount.findUnique({
      where: {
        customerId_restaurantId: {
          customerId,
          restaurantId,
        },
      },
    });

    return discount || { discount: 0, isActive: false };
  }

  async setPersonalDiscount(
    customerId: string, 
    restaurantId: string, 
    discount: number
  ) {
    if (discount < 0 || discount > 100) {
      throw new BadRequestException('Скидка должна быть в диапазоне от 0 до 100%');
    }

    // Проверяем существование ресторана
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { network: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Ресторан не найден');
    }

    const personalDiscount = await this.prisma.personalDiscount.upsert({
      where: {
        customerId_restaurantId: {
          customerId,
          restaurantId,
        },
      },
      create: {
        customerId,
        restaurantId,
        discount,
      },
      update: {
        discount,
        updatedAt: new Date(),
      },
    });

    return personalDiscount;
  }

  async getCustomerPersonalDiscounts(customerId: string) {
    return this.prisma.personalDiscount.findMany({
      where: { customerId, isActive: true },
      include: {
        restaurant: {
          select: {
            id: true,
            title: true,
            network: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // ========== Бонусные балансы по сетям ==========

  async getBonusBalance(customerId: string, networkId: string) {
    const balance = await this.prisma.customerBonusBalance.findUnique({
      where: {
        customerId_networkId: {
          customerId,
          networkId,
        },
      },
    });

    return balance || { balance: 0, totalEarned: 0, totalSpent: 0 };
  }

  async getCustomerBonusBalances(customerId: string) {
    return this.prisma.customerBonusBalance.findMany({
      where: { customerId },
      include: {
        network: {
          select: {
            id: true,
            name: true,
            logo: true,
            primaryColor: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Начисление бонусов
  async earnBonusPoints(
    customerId: string,
    networkId: string,
    amount: number,
    orderId?: string,
    description?: string
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Количество бонусов должно быть положительным');
    }

    const balance = await this.prisma.customerBonusBalance.upsert({
      where: {
        customerId_networkId: {
          customerId,
          networkId,
        },
      },
      create: {
        customerId,
        networkId,
        balance: amount,
        totalEarned: amount,
      },
      update: {
        balance: { increment: amount },
        totalEarned: { increment: amount },
        updatedAt: new Date(),
      },
    });

    // Создаем запись о транзакции
    await this.prisma.bonusTransaction.create({
      data: {
        customerId,
        networkId,
        type: 'EARN',
        amount,
        balanceAfter: balance.balance,
        orderId,
        description: description || `Начисление бонусов${orderId ? ` за заказ №${orderId}` : ''}`,
      },
    });

    return balance;
  }

  // Списание бонусов
  async spendBonusPoints(
    customerId: string,
    networkId: string,
    amount: number,
    orderId?: string,
    description?: string
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Количество бонусов должно быть положительным');
    }

    const balance = await this.prisma.customerBonusBalance.findUnique({
      where: {
        customerId_networkId: {
          customerId,
          networkId,
        },
      },
    });

    if (!balance || balance.balance < amount) {
      throw new BadRequestException('Недостаточно бонусных баллов');
    }

    const updatedBalance = await this.prisma.customerBonusBalance.update({
      where: {
        customerId_networkId: {
          customerId,
          networkId,
        },
      },
      data: {
        balance: { decrement: amount },
        totalSpent: { increment: amount },
        updatedAt: new Date(),
      },
    });

    // Создаем запись о транзакции
    await this.prisma.bonusTransaction.create({
      data: {
        customerId,
        networkId,
        type: 'SPEND',
        amount: -amount,
        balanceAfter: updatedBalance.balance,
        orderId,
        description: description || `Списание бонусов${orderId ? ` за заказ №${orderId}` : ''}`,
      },
    });

    return updatedBalance;
  }

  // Корректировка баланса (для админов)
  async adjustBonusBalance(
    customerId: string,
    networkId: string,
    amount: number,
    reason: string
  ) {
    const balance = await this.prisma.customerBonusBalance.upsert({
      where: {
        customerId_networkId: {
          customerId,
          networkId,
        },
      },
      create: {
        customerId,
        networkId,
        balance: amount >= 0 ? amount : 0,
        totalEarned: amount >= 0 ? amount : 0,
      },
      update: {
        balance: { increment: amount },
        totalEarned: amount >= 0 ? { increment: amount } : undefined,
        totalSpent: amount < 0 ? { increment: Math.abs(amount) } : undefined,
        updatedAt: new Date(),
      },
    });

    const transactionType = amount >= 0 ? 'ADJUST' : 'ADJUST';

    await this.prisma.bonusTransaction.create({
      data: {
        customerId,
        networkId,
        type: transactionType,
        amount,
        balanceAfter: balance.balance,
        description: `Корректировка баланса: ${reason}`,
      },
    });

    return balance;
  }

  // Получение истории транзакций
  async getBonusTransactions(
    customerId: string,
    networkId?: string,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    const where = networkId 
      ? { customerId, networkId }
      : { customerId };

    const [transactions, total] = await Promise.all([
      this.prisma.bonusTransaction.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              number: true,
              restaurant: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
          network: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.bonusTransaction.count({ where }),
    ]);

    return {
      data: transactions,
      pagination: {
        total,
        page,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  // Получение сводной информации о лояльности клиента
  async getCustomerLoyaltySummary(customerId: string) {
    const [personalDiscounts, bonusBalances, recentTransactions] = await Promise.all([
      this.getCustomerPersonalDiscounts(customerId),
      this.getCustomerBonusBalances(customerId),
      this.getBonusTransactions(customerId, undefined, 1, 5),
    ]);

    const totalBonusBalance = bonusBalances.reduce((sum, balance) => sum + balance.balance, 0);

    return {
      customerId,
      personalDiscounts: {
        count: personalDiscounts.length,
        items: personalDiscounts,
      },
      bonusBalances: {
        total: totalBonusBalance,
        byNetwork: bonusBalances,
      },
      recentTransactions: recentTransactions.data,
    };
  }
}