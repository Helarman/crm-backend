import { Injectable, BadRequestException, UnauthorizedException, NotFoundException} from '@nestjs/common';
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
    const code = this.generateRandomCode();
    const expiresInMinutes = this.config.get<number>('CODE_EXPIRATION_MINUTES', 5);
    const codeExpires = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    await this.prisma.customer.upsert({
      where: { phone },
      create: { 
        phone, 
        code, 
        codeExpires 
      },
      update: { 
        code, 
        codeExpires 
      },
    });

    console.log(`Код для ${phone}: ${code}`);
    return { success: true };
  }

  async verifyCode(phone: string, code: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { phone },
    });

    if (!customer || customer.code !== code) {
      throw new BadRequestException('Неправильный код');
    }

    if (customer.codeExpires && customer.codeExpires < new Date()) {
      throw new BadRequestException('Код истек');
    }

    await this.prisma.customer.update({
      where: { phone },
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
        phone: customer.phone
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
    const customer = await this.prisma.customer.findUnique({
      where: { phone },
      select: {
        id: true,
        phone: true,
        createdAt: true,
        lastLogin: true,
        // другие поля, которые вы хотите возвращать
      }
    });

    if (!customer) {
      throw new NotFoundException('Клиент не найден');
    }

    return customer;
  }
}