import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { User as PrismaUser } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuthDto } from '../auth/dto/auth.dto';
import { EnumUserRoles } from '@prisma/client';
import { $Enums } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';

// Определяем полный тип пользователя с паролем
type UserWithPassword = PrismaUser & { password: string };

@Injectable()
export class UserService {
  private readonly hashOptions = {
    type: argon2.argon2id,
    timeCost: 3,
    memoryCost: 4096,
    parallelism: 1
  };
  
  private readonly logger = new Logger(UserService.name);
  
  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<PrismaUser[]> {
    return this.prisma.user.findMany({
      include: {
        restaurant: true,
        workshops: {
          include: {
            workshop: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });
  }

  async getByEmail(email: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async getByEmailWithPassword(email: string): Promise<UserWithPassword | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        picture: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        isBlocked: true,
      },
    });
  }

  async getById(id: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        workshops: {
          include: {
            workshop: {
              select: {
                name: true
              }
            }
          }
        },
        restaurant: true
      }
    });
  }

  async create(dto: AuthDto): Promise<PrismaUser> {
    const data: any = {
      email: dto.email,
      password: dto.password,
      name: dto.name,
      role: dto.role ? dto.role : 'SUPERVISOR',
    };
    
    // Добавляем телефон, если он предоставлен
    if (dto.phone) {
      data.phone = dto.phone;
    }
    
    const newUser = await this.prisma.user.create({
      data,
    });
    
    this.logger.log(`User created: ${newUser.email} with phone: ${newUser.phone || 'not provided'}`);
    return newUser;
  }

  async update(id: string, dto: UpdateUserDto): Promise<PrismaUser> {
    // Проверяем существование пользователя
    const existingUser = await this.prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Если обновляется email, проверяем что он не занят другим пользователем
    if (dto.email && dto.email !== existingUser.email) {
      const userWithSameEmail = await this.prisma.user.findUnique({
        where: { email: dto.email }
      });

      if (userWithSameEmail) {
        throw new ConflictException('Email already taken');
      }
    }

    // Подготавливаем данные для обновления
    const updateData: any = {};
    
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.isBlocked !== undefined) updateData.isBlocked = dto.isBlocked;
    if (dto.picture !== undefined) updateData.picture = dto.picture;

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        restaurant: true,
        workshops: {
          include: {
            workshop: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    this.logger.log(`User updated: ${updatedUser.email}`);
    return updatedUser;
  }

  async delete(id: string): Promise<PrismaUser> {
    // Проверяем существование пользователя
    const existingUser = await this.prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    

    this.logger.log(`User deleted: ${existingUser.email}`);
    return existingUser;
  }
 
  async updateRole(id: string, role: $Enums.EnumUserRoles): Promise<PrismaUser> {
    // Проверяем существование пользователя
    const existingUser = await this.prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { role },
    });

    this.logger.log(`User role updated: ${updatedUser.email} -> ${role}`);
    return updatedUser;
  }

  // Дополнительный метод для смены пароля
  async changePassword(id: string, newPassword: string): Promise<PrismaUser> {
    const hashedPassword = await argon2.hash(newPassword, this.hashOptions);
    
    return this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  async toggleBlock(id: string, isBlocked: boolean): Promise<PrismaUser> {
  // Проверяем существование пользователя
  const existingUser = await this.prisma.user.findUnique({
    where: { id }
  });

  if (!existingUser) {
    throw new NotFoundException(`User with ID ${id} not found`);
  }

  // Обновляем статус блокировки
  const updatedUser = await this.prisma.user.update({
    where: { id },
    data: { isBlocked },
    include: {
      restaurant: true,
      workshops: {
        include: {
          workshop: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });

  this.logger.log(
    `User ${updatedUser.email} ${isBlocked ? 'blocked' : 'unblocked'}`
  );
  
  return updatedUser;
}
}