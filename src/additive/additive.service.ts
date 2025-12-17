import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateAdditiveDto } from './dto/create-additive.dto';
import { UpdateAdditiveDto } from './dto/update-additive.dto';
import { AdditiveWithProducts } from './interfaces/additive.interface';

@Injectable()
export class AdditiveService {
  private readonly logger = new Logger(AdditiveService.name);

  constructor(private prisma: PrismaService) {}

  async create(createAdditiveDto: CreateAdditiveDto): Promise<AdditiveWithProducts> {
    return this.prisma.additive.create({
      data: {
        title: createAdditiveDto.title,
        price: createAdditiveDto.price,
        ...(createAdditiveDto.networkId && {
          network: {
            connect: { id: createAdditiveDto.networkId }
          }
        })
      },
      include: { 
        products: true,
        network: true 
      },
    });
  }

  async findAll(): Promise<AdditiveWithProducts[]> {
    return this.prisma.additive.findMany({
      include: { 
        products: true,
        network: true 
      },
    });
  }

  async findOne(id: string): Promise<AdditiveWithProducts | null> {
    return this.prisma.additive.findUnique({
      where: { id },
      include: { 
        products: true,
        network: true 
      },
    });
  }

 async update(
  id: string,
  updateAdditiveDto: UpdateAdditiveDto,
): Promise<AdditiveWithProducts> {
  // Подготавливаем данные для обновления
  const updateData: any = {
    title: updateAdditiveDto.title,
    price: updateAdditiveDto.price,
  };

  // Обрабатываем связь с сетью
  if (updateAdditiveDto.networkId === null || updateAdditiveDto.networkId === undefined) {
    // Если networkId явно установлен в null/undefined, отключаем связь
    updateData.network = {
      disconnect: true
    };
  } else if (updateAdditiveDto.networkId) {
    // Если указан networkId, подключаем сеть
    updateData.network = {
      connect: { id: updateAdditiveDto.networkId }
    };
  }

  return this.prisma.additive.update({
    where: { id },
    data: updateData,
    include: { 
      products: true,
      network: true 
    },
  });
}

  async remove(id: string): Promise<AdditiveWithProducts> {
    return this.prisma.additive.delete({
      where: { id },
      include: { 
        products: true,
        network: true 
      },
    });
  }

  async addToProduct(additiveId: string, productId: string): Promise<AdditiveWithProducts> {
    // Проверяем, принадлежат ли additive и product одной сети
    const [additive, product] = await Promise.all([
      this.prisma.additive.findUnique({
        where: { id: additiveId },
        include: { network: true }
      }),
      this.prisma.product.findUnique({
        where: { id: productId },
        include: { network: true }
      })
    ]);

    if (!additive) {
      throw new NotFoundException(`Additive with ID ${additiveId} not found`);
    }

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Проверяем совместимость сетей
    if (additive.networkId && product.networkId && additive.networkId !== product.networkId) {
      throw new BadRequestException('Additive and product must belong to the same network');
    }

    return this.prisma.additive.update({
      where: { id: additiveId },
      data: {
        products: {
          connect: { id: productId },
        },
      },
      include: { 
        products: true,
        network: true 
      },
    });
  }

  async removeFromProduct(additiveId: string, productId: string): Promise<AdditiveWithProducts> {
    return this.prisma.additive.update({
      where: { id: additiveId },
      data: {
        products: {
          disconnect: { id: productId },
        },
      },
      include: { 
        products: true,
        network: true 
      },
    });
  }

  async getProductAdditives(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { 
        additives: {
          include: { network: true }
        } 
      }
    });
    
    return product?.additives || [];
  }

  async updateProductAdditives(
    productId: string,
    additiveIds: string[],
  ): Promise<AdditiveWithProducts[]> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { network: true }
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Получаем все модификаторы
    const existingAdditives = await this.prisma.additive.findMany({
      where: { id: { in: additiveIds } },
      include: { network: true }
    });

    if (existingAdditives.length !== additiveIds.length) {
      const foundIds = existingAdditives.map(a => a.id);
      const missingIds = additiveIds.filter(id => !foundIds.includes(id));
      throw new BadRequestException(`Some additives not found: ${missingIds.join(', ')}`);
    }

    // Проверяем, что все модификаторы совместимы с продуктом
    if (product.networkId) {
      const incompatibleAdditives = existingAdditives.filter(
        additive => additive.networkId && additive.networkId !== product.networkId
      );
      
      if (incompatibleAdditives.length > 0) {
        throw new BadRequestException(
          `Some additives belong to different network: ${incompatibleAdditives.map(a => a.id).join(', ')}`
        );
      }
    }

    // Обновляем связи
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        additives: {
          set: additiveIds.map(id => ({ id })),
        },
      },
    });

    // Возвращаем обновленный список
    return this.getProductAdditives(productId);
  }

  async getByNetwork(networkId: string): Promise<AdditiveWithProducts[]> {
    // Проверяем существование сети
    const network = await this.prisma.network.findUnique({
      where: { id: networkId }
    });

    if (!network) {
      throw new NotFoundException(`Network with ID ${networkId} not found`);
    }

    return this.prisma.additive.findMany({
      where: {
        OR: [
          { networkId: networkId },
          { networkId: null } // Глобальные модификаторы тоже доступны
        ]
      },
      include: {
        products: true,
        network: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getByNetworkPaginated(
    networkId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: AdditiveWithProducts[]; total: number; page: number; limit: number }> {
    const network = await this.prisma.network.findUnique({
      where: { id: networkId }
    });

    if (!network) {
      throw new NotFoundException(`Network with ID ${networkId} not found`);
    }

    const skip = (page - 1) * limit;
    
    const [additives, total] = await Promise.all([
      this.prisma.additive.findMany({
        where: {
          OR: [
            { networkId: networkId },
            { networkId: null }
          ]
        },
        include: {
          products: true,
          network: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      this.prisma.additive.count({
        where: {
          OR: [
            { networkId: networkId },
            { networkId: null }
          ]
        }
      })
    ]);

    return {
      data: additives,
      total,
      page,
      limit
    };
  }

  async getGlobalAdditives(): Promise<AdditiveWithProducts[]> {
    return this.prisma.additive.findMany({
      where: {
        networkId: null
      },
      include: {
        products: true,
        network: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
}