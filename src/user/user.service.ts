import { Injectable,Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { User as PrismaUser } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuthDto } from '../auth/dto/auth.dto';
import { EnumUserRoles } from '@prisma/client';
import { $Enums } from '@prisma/client';

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
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getById(id: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        workshops: true,
        restaurant: true 
      }
    });
  }

  async create(dto: AuthDto): Promise<PrismaUser> {
    
    return this.prisma.user.create({
      data: {
        email: dto.email,
        password: dto.password,
        name: dto.name,
      },
    });
  }

  async update(id: string, dto: Partial<PrismaUser>): Promise<PrismaUser> {
    return this.prisma.user.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string): Promise<PrismaUser> {
    return this.prisma.user.delete({
      where: { id },
    });
  }
 
  async updateRole(id: string, role: $Enums.EnumUserRoles): Promise<PrismaUser> {
    return this.prisma.user.update({
      where: { id },
      data: { role },
    });
  }
}
