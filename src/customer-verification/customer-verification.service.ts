import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class CustomerVerificationService {
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

  async requestCode(phone: string) {
    const normalizedPhone = this.normalizePhone(phone);
    const code = this.generateRandomCode();
    const expiresInMinutes = this.config.get<number>('CODE_EXPIRATION_MINUTES', 5);
    const codeExpires = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    await this.prisma.customer.upsert({
      where: { phone: normalizedPhone },
      create: { 
        phone: normalizedPhone, 
        code, 
        codeExpires 
      },
      update: { 
        code, 
        codeExpires 
      },
    });

    console.log(`Код для ${normalizedPhone}: ${code}`);
    return { success: true };
  }

  async verifyCode(phone: string, code: string) {
    const normalizedPhone = this.normalizePhone(phone);
    const customer = await this.prisma.customer.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!customer || customer.code !== code) {
      throw new BadRequestException('Неправильный код');
    }

    if (customer.codeExpires && customer.codeExpires < new Date()) {
      throw new BadRequestException('Код истек');
    }

    await this.prisma.customer.update({
      where: { phone: normalizedPhone },
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
        bonusPoints: customer.bonusPoints
      }
    };
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

  async getCustomerByPhone(phone: string) {
    const normalizedPhone = this.normalizePhone(phone);
    const customer = await this.prisma.customer.findUnique({
      where: { phone: normalizedPhone },
      select: {
        id: true,
        phone: true,
        bonusPoints: true,
        createdAt: true,
        lastLogin: true,
      }
    });

    if (!customer) {
      throw new NotFoundException('Клиент не найден');
    }

    return customer;
  }

  async getAllCustomers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const maxLimit = 100;
    const take = Math.min(limit, maxLimit);
    
    const [customers, totalCount] = await Promise.all([
      this.prisma.customer.findMany({
        skip,
        take,
        select: {
          id: true,
          phone: true,
          bonusPoints: true,
          createdAt: true,
          lastLogin: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.customer.count(),
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

  async updateBonusPoints(customerId: string, bonusPoints: number) {
    if (isNaN(bonusPoints)) {
      throw new BadRequestException('Бонусные баллы должны быть числом');
    }
    
    if (bonusPoints < 0) {
      throw new BadRequestException('Бонусные баллы не могут быть отрицательными');
    }

    return this.prisma.customer.update({
      where: { id: customerId },
      data: { bonusPoints },
      select: {
        id: true,
        phone: true,
        bonusPoints: true,
        createdAt: true,
        lastLogin: true
      }
    });
  }

  async incrementBonusPoints(customerId: string, pointsToAdd: number) {
    if (isNaN(pointsToAdd)) {
      throw new BadRequestException('Количество баллов должно быть числом');
    }

    return this.prisma.customer.update({
      where: { id: customerId },
      data: { 
        bonusPoints: { increment: pointsToAdd } 
      },
      select: {
        id: true,
        phone: true,
        bonusPoints: true,
        createdAt: true,
        lastLogin: true
      }
    });
  }
}