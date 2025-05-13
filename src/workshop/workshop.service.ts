import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { WorkshopResponseDto } from './dto/workshop-response.dto';

@Injectable()
export class WorkshopService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkshopDto): Promise<WorkshopResponseDto> {
    const workshop = await this.prisma.workshop.create({
      data: {
        name: dto.name,
      },
    });

    return this.mapToDto(workshop);
  }

  async findAll(): Promise<WorkshopResponseDto[]> {
    const workshops = await this.prisma.workshop.findMany();
    return workshops.map(this.mapToDto);
  }

  async findOne(id: string): Promise<WorkshopResponseDto> {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id },
    });

    if (!workshop) {
      throw new NotFoundException('Цех не найден');
    }

    return this.mapToDto(workshop);
  }

  async update(id: string, dto: UpdateWorkshopDto): Promise<WorkshopResponseDto> {
    const workshop = await this.prisma.workshop.update({
      where: { id },
      data: {
        name: dto.name,
      },
    });

    return this.mapToDto(workshop);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.workshop.delete({
      where: { id },
    });
  }

  private mapToDto(workshop: any): WorkshopResponseDto {
    return {
      id: workshop.id,
      name: workshop.name,
      createdAt: workshop.createdAt,
      updatedAt: workshop.updatedAt,
    };
  }

   async addUsers(workshopId: string, userIds: string[]): Promise<void> {
    await this.prisma.userWorkshop.createMany({
      data: userIds.map(userId => ({
        workshopId,
        userId,
      })),
      skipDuplicates: true, // Пропустить существующие связи
    });
  }

  async removeUsers(workshopId: string, userIds: string[]): Promise<void> {
    await this.prisma.userWorkshop.deleteMany({
      where: {
        workshopId,
        userId: {
          in: userIds,
        },
      },
    });
  }

  async getUsers(workshopId: string): Promise<string[]> {
    const userWorkshops = await this.prisma.userWorkshop.findMany({
      where: { workshopId },
      select: { userId: true },
    });
    
    return userWorkshops.map(uw => uw.userId);
  }
}