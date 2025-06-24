import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    try {
      return await this.prisma.tenant.findMany({
        include: { network: true }
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch tenants');
    }
  }

  async getById(id: string) {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id },
        include: { network: true }
      });

      if (!tenant) {
        throw new NotFoundException(`Tenant with ID ${id} not found`);
      }
      return tenant;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to fetch tenant');
    }
  }

  async create(dto: CreateTenantDto) {
    try {
      // Проверяем существование сети, если указан networkId
      if (dto.networkId) {
        // Альтернативный вариант проверки через relation
        const networkWithTenant = await this.prisma.network.findUnique({
          where: { id: dto.networkId },
          include: { tenant: true }
        });

        if (!networkWithTenant) {
          throw new BadRequestException(`Network with ID ${dto.networkId} not found`);
        }

        if (networkWithTenant.tenant) {
          throw new ConflictException(`Network ${dto.networkId} is already assigned to tenant ${networkWithTenant.tenant.id}`);
        }
      }

      // Создаем tenant с правильной связью
      return await this.prisma.tenant.create({
        data: {
          name: dto.name,
          type: dto.type,
          domain: dto.domain,
          subdomain: dto.subdomain,
          primaryColor: dto.primaryColor || '#4f46e5',
          secondaryColor: dto.secondaryColor || '#1e293b',
          accentColor: dto.accentColor || '#f43f5e',
          // Правильное использование связи
          network: dto.networkId ? {
            connect: { id: dto.networkId }
          } : undefined
        },
        include: {
          network: true
        }
      });
    } catch (error) {
      // Обработка ошибок Prisma
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case 'P2002':
            const target = error.meta?.target as string[];
            if (target?.includes('subdomain')) {
              throw new ConflictException('Subdomain must be unique');
            }
            if (target?.includes('networkId')) {
              throw new ConflictException('Network can only be assigned to one tenant');
            }
            break;
          case 'P2025':
            throw new NotFoundException('Related record not found');
        }
      }

      // Пробрасываем уже обработанные ошибки
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to create tenant');
    }
  }


 async update(id: string, dto: UpdateTenantDto) {
  try {
    // Проверяем существование тенанта
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { network: true }
    });

    if (!existingTenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    // Если пытаемся обновить связь с сетью
    if (dto.networkId !== undefined) {
      // Если передается конкретный networkId
      if (dto.networkId) {
        // Проверяем существует ли сеть
        const network = await this.prisma.network.findUnique({
          where: { id: dto.networkId },
          include: { tenant: true }
        });

        if (!network) {
          throw new BadRequestException(`Network with ID ${dto.networkId} not found`);
        }

        // Проверяем не привязана ли сеть к другому тенанту
        if (network.tenant && network.tenant.id !== id) {
          throw new ConflictException(
            `Network ${dto.networkId} is already assigned to tenant ${network.tenant.id}`
          );
        }
      }
      
      // Если передается null - значит нужно отвязать сеть
      // Если передается новый networkId - свяжем с новой сетью
    }

    // Подготовка данных для обновления
    const updateData: Prisma.TenantUpdateInput = {
      name: dto.name,
      type: dto.type,
      domain: dto.domain,
      subdomain: dto.subdomain,
      primaryColor: dto.primaryColor,
      secondaryColor: dto.secondaryColor,
      accentColor: dto.accentColor,
      isActive: dto.isActive
    };

    // Обрабатываем связь с сетью
    if (dto.networkId !== undefined) {
      updateData.network = dto.networkId
        ? { connect: { id: dto.networkId } }
        : { disconnect: true };
    }

    // Выполняем обновление
    return await this.prisma.tenant.update({
      where: { id },
      data: updateData,
      include: { network: true }
    });

  } catch (error) {
    // Обработка ошибок Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          const target = error.meta?.target as string[];
          if (target?.includes('subdomain')) {
            throw new ConflictException('Subdomain must be unique');
          }
          if (target?.includes('networkId')) {
            throw new ConflictException('Network can only be assigned to one tenant');
          }
          throw new ConflictException('Unique constraint violation');
        case 'P2025':
          throw new NotFoundException('Related record not found');
        default:
          console.error('Prisma error:', error);
          throw new InternalServerErrorException('Database operation failed');
      }
    }

    // Пробрасываем кастомные ошибки
    if (
      error instanceof NotFoundException ||
      error instanceof BadRequestException ||
      error instanceof ConflictException
    ) {
      throw error;
    }

    console.error('Unexpected error:', error);
    throw new InternalServerErrorException('Failed to update tenant');
  }
}

  async delete(id: string) {
    try {
      await this.getById(id);
      return await this.prisma.tenant.delete({
        where: { id }
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to delete tenant');
    }
  }

   async getByNetworkId(networkId: string) {
    try {
      const network = await this.prisma.network.findUnique({
        where: { id: networkId },
        include: { tenant: true }
      });

      if (!network) {
        throw new NotFoundException(`Network ${networkId} not found`);
      }

      if (!network.tenant) {
        throw new NotFoundException(`No tenant assigned to network ${networkId}`);
      }

      return network.tenant;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to fetch tenant by network ID');
    }
  }

  async getByDomain(domain: string) {
    try {
      // Ищем тенант по domain или subdomain
      const tenant = await this.prisma.tenant.findMany({
        where: {
          OR: [
            { domain: domain },
            { subdomain: domain }
          ]
        },
        include: {
          network: {
            include: {
              owner: true,
              restaurants: {
                include: {
                  delivery_zones: true,
                  productPrices: true,
                  users: true
                }
              }
            }
          }
        }
      });

      if (!tenant) {
        throw new NotFoundException('Тенант не найден');
      }

      return tenant;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Ошибка при получении тенанта');
    }
  }

}