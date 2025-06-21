import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateOrderLogDto } from './dto/create-order-log.dto';
import { OrderLogResponseDto } from './dto/order-log-response.dto';

@Injectable()
export class OrderLogService {
  constructor(private readonly prisma: PrismaService) {}

  async createLog(createOrderLogDto: CreateOrderLogDto): Promise<OrderLogResponseDto> {
    const log = await this.prisma.orderLog.create({
      data: {
        orderId: createOrderLogDto.orderId,
        userId: createOrderLogDto.userId,
        action: createOrderLogDto.action,
        message: '',
        metadata: createOrderLogDto.metadata || {},
      },
    });

    return this.mapToDto(log);
  }

  async getLogsByOrder(orderId: string): Promise<OrderLogResponseDto[]> {
    const logs = await this.prisma.orderLog.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
       include: {
        user: {
          select: {
            name: true
          }
        }
      }
    });

    return logs.map(this.mapToDto);
  }

  private mapToDto(log: any): OrderLogResponseDto {
    return {
      id: log.id,
      createdAt: log.createdAt,
      orderId: log.orderId,
      userId: log.userId,
      action: log.action,
      userName: log.user?.name || null,
      message: log.message,
      metadata: log.metadata,
    };
  }
}