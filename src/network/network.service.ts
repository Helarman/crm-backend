import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateNetworkDto } from './dto/create-network.dto';
import { UpdateNetworkDto } from './dto/update-network.dto';

@Injectable()
export class NetworkService {
  constructor(private prisma: PrismaService) {}

  private includeDetails = {
    owner: true,
    tenant: true,
    restaurants: true
  };

  async getAll() {
    return this.prisma.network.findMany({
      include: this.includeDetails
    });
  }

  async getById(id: string) {
    const network = await this.prisma.network.findUnique({
      where: { id },
      include: this.includeDetails
    });

    if (!network) throw new NotFoundException('Сеть не найдена');
    return network;
  }

  async create(dto: CreateNetworkDto) {
    // Проверяем owner
    const owner = await this.prisma.user.findUnique({
      where: { id: dto.ownerId }
    });
    if (!owner) throw new NotFoundException('Владелец не найден');

    // Проверяем tenant, если указан
    if (dto.tenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: dto.tenantId }
      });
      if (!tenant) throw new NotFoundException('Тенант не найден');
    }

    return this.prisma.network.create({
      data: {
        name: dto.name,
        description: dto.description,
        primaryColor: dto.primaryColor,
        logo: dto.logo,
        owner: { connect: { id: dto.ownerId } },
        tenant: dto.tenantId ? { connect: { id: dto.tenantId } } : undefined
      },
      include: this.includeDetails
    });
  }

  async update(id: string, dto: UpdateNetworkDto) {
    await this.getById(id);
    
    return this.prisma.network.update({
      where: { id },
      data: dto,
      include: this.includeDetails
    });
  }

  async getRestaurants(networkId: string) {
    const network = await this.prisma.network.findUnique({
      where: { id: networkId },
      include: { restaurants: true }
    });

    if (!network) throw new NotFoundException('Сеть не найдена');
    return network.restaurants;
  }

  async delete(id: string) {
    await this.getById(id);
    return this.prisma.network.delete({
      where: { id }
    });
  }

  async getNetworksByUser(userId: string) {
  // First check if user exists
  const user = await this.prisma.user.findUnique({
    where: { id: userId }
  });
  if (!user) throw new NotFoundException('Пользователь не найден');

  return this.prisma.network.findMany({
    where: { ownerId: userId
    },
    include: this.includeDetails
  });
}

}