import { 
  Injectable, 
  ConflictException, 
  NotFoundException,
  BadRequestException 
} from '@nestjs/common';
import { PaymentProviderType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreatePaymentIntegrationDto } from './dto/create-payment-integration.dto';
import { UpdatePaymentIntegrationDto } from './dto/update-payment-integration.dto';

@Injectable()
export class PaymentIntegrationService {
  constructor(private prisma: PrismaService) {}

  private validateProviderFields(provider: PaymentProviderType, data: any) {
    const requiredFields: { [key in PaymentProviderType]?: string[] } = {
      [PaymentProviderType.YOOKASSA]: ['yookassaShopId', 'yookassaSecretKey'],
      [PaymentProviderType.CLOUDPAYMENTS]: ['cloudpaymentsPublicId', 'cloudpaymentsApiSecret'],
      [PaymentProviderType.SBERBANK]: ['sberbankLogin', 'sberbankPassword'],
      [PaymentProviderType.ALFABANK]: ['alfabankLogin', 'alfabankPassword'],
      [PaymentProviderType.SBP]: ['sbpMerchantId', 'sbpSecretKey'],
      [PaymentProviderType.TINKOFF]: ['tinkoffTerminalKey', 'tinkoffPassword'],
    };

    const fields = requiredFields[provider];
    if (fields) {
      for (const field of fields) {
        if (!data[field]) {
          throw new BadRequestException(`Поле ${field} обязательно для провайдера ${provider}`);
        }
      }
    }
  }

  async createIntegration(restaurantId: string, dto: CreatePaymentIntegrationDto) {
    // Проверяем, что ресторан существует
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId }
    });
    
    if (!restaurant) {
      throw new NotFoundException('Ресторан не найден');
    }

    // Проверяем обязательные поля для выбранного провайдера
    this.validateProviderFields(dto.provider as PaymentProviderType, dto);

    // Проверяем, что у ресторана нет уже активной интеграции этого типа
    const existingIntegration = await this.prisma.paymentIntegration.findFirst({
      where: {
        restaurantId,
        provider: dto.provider as PaymentProviderType
      }
    });

    if (existingIntegration) {
      throw new ConflictException(`Интеграция ${dto.provider} уже существует для этого ресторана`);
    }

    return this.prisma.paymentIntegration.create({
      data: {
        ...dto,
        restaurantId,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            title: true,
          }
        }
      }
    });
  }

  async getRestaurantIntegrations(restaurantId: string) {
    // Проверяем существование ресторана
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId }
    });

    if (!restaurant) {
      throw new NotFoundException('Ресторан не найден');
    }

    return this.prisma.paymentIntegration.findMany({
      where: { restaurantId },
      include: {
        restaurant: {
          select: {
            id: true,
            title: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getIntegrationById(id: string) {
    const integration = await this.prisma.paymentIntegration.findUnique({
      where: { id },
      include: {
        restaurant: {
          select: {
            id: true,
            title: true,
          }
        }
      }
    });

    if (!integration) {
      throw new NotFoundException('Интеграция не найдена');
    }

    return integration;
  }

  async getActiveIntegration(restaurantId: string, provider: PaymentProviderType) {
    return this.prisma.paymentIntegration.findFirst({
      where: {
        restaurantId,
        provider,
        isActive: true
      }
    });
  }

  async updateIntegration(id: string, dto: UpdatePaymentIntegrationDto) {
    const integration = await this.prisma.paymentIntegration.findUnique({
      where: { id }
    });

    if (!integration) {
      throw new NotFoundException('Интеграция не найдена');
    }

    // Если меняется провайдер, проверяем обязательные поля
    if (dto.provider && dto.provider !== integration.provider) {
      this.validateProviderFields(dto.provider as PaymentProviderType, dto);
    }

    return this.prisma.paymentIntegration.update({
      where: { id },
      data: dto,
      include: {
        restaurant: {
          select: {
            id: true,
            title: true,
          }
        }
      }
    });
  }

  async deleteIntegration(id: string) {
    const integration = await this.prisma.paymentIntegration.findUnique({
      where: { id }
    });

    if (!integration) {
      throw new NotFoundException('Интеграция не найдена');
    }

    return this.prisma.paymentIntegration.delete({
      where: { id }
    });
  }

  async toggleIntegrationStatus(id: string, isActive: boolean) {
    const integration = await this.prisma.paymentIntegration.findUnique({
      where: { id }
    });

    if (!integration) {
      throw new NotFoundException('Интеграция не найдена');
    }

    return this.prisma.paymentIntegration.update({
      where: { id },
      data: { isActive },
      include: {
        restaurant: {
          select: {
            id: true,
            title: true,
          }
        }
      }
    });
  }
}