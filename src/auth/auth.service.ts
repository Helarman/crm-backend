import {
	BadRequestException,
	Injectable,
	NotFoundException,
	UnauthorizedException,
	InternalServerErrorException,
  } from '@nestjs/common';
  import { ConfigService } from '@nestjs/config';
  import { JwtService } from '@nestjs/jwt';
  import { Response } from 'express';
  import { PrismaService } from 'src/prisma.service';
  import { UserService } from 'src/user/user.service';
  import { AuthDto, RegisterDto } from './dto/auth.dto';
  import * as argon2 from 'argon2'
  import { User } from '@prisma/client';
  import { Logger } from '@nestjs/common';
  
  @Injectable()
  export class AuthService {
	private readonly logger = new Logger(AuthService.name);
  
	readonly REFRESH_TOKEN_NAME = 'refreshToken';
	readonly ACCESS_TOKEN_EXPIRES_IN = '1d';
	readonly REFRESH_TOKEN_EXPIRES_IN = '7d';

	private readonly hashOptions = {
		type: argon2.argon2id,
		timeCost: 3,
		memoryCost: 4096,
		parallelism: 1
	  };

	constructor(
	  private readonly jwtService: JwtService,
	  private readonly userService: UserService,
	  private readonly prismaService: PrismaService,
	  private readonly configService: ConfigService,
	) {}
  
	async login(dto: AuthDto): Promise<{
		user: Omit<User, 'password'>;
		accessToken: string;
		refreshToken: string;
	}> {
    try {
		const user = await this.userService.getByEmailWithPassword(dto.email);
		if (!user) {
			throw new NotFoundException('Пользователь не найден');
		}
 		if (user.isBlocked) {
            this.logger.warn(`Blocked user attempted login: ${user.email}`);
            throw new UnauthorizedException('Учетная запись заблокирована');
        }

		const isPasswordValid = await argon2.verify(user.password, dto.password);
		this.logger.log(`${user.password} dto.password`)
		if (!isPasswordValid) {
			throw new UnauthorizedException('Неверные учетные данные');
		}

		const tokens = await this.generateTokens(user.id);
		return {
			user: this.excludeSensitiveFields(user),
			...tokens,
		};
		} catch (error) {
		this.logger.error(`Login failed: ${error.message}`);
		throw error;
		}
	}

	async register(dto: RegisterDto): Promise<{
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken: string;
}> {
  try {
    const existingUser = await this.userService.getByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('Пользователь с таким email уже существует');
    }
   	if (dto.phone) {
      const existingPhone = await this.prismaService.user.findUnique({
        where: { phone: dto.phone }
      });
      
      if (existingPhone) {
        throw new BadRequestException('Пользователь с таким номером телефона уже существует');
      }
    }
    const hashedPassword = await argon2.hash(dto.password, this.hashOptions);
    const user = await this.userService.create({
      email: dto.email,
      password: hashedPassword,
	  role: 'SUPERVISOR',
      name: dto.name, 
	   phone: dto.phone,
    });

    const tokens = await this.generateTokens(user.id);
    
    return {
      user: this.excludeSensitiveFields(user),
      ...tokens,
    };
  } catch (error) {
		this.logger.error(`Registration failed: ${error.message}`);
		throw new BadRequestException('Ошибка регистрации');
		}
	}
	
	async verifyPassword(plainText: string, hash: string): Promise<boolean> {
		try {
		return await argon2.verify(hash, plainText);
		} catch (error) {
		this.logger.error(`Password verification failed: ${error.message}`);
		return false;
		}
	}
	
	async hashPassword(password: string): Promise<string> {
		return argon2.hash(password, this.hashOptions);
	}
  
	async refreshTokens(refreshToken: string): Promise<{
	  accessToken: string;
	  refreshToken: string;
	}> {
	  if (!refreshToken) {
		this.logger.warn('Refresh token attempt with empty token');
		throw new UnauthorizedException('Refresh token не предоставлен');
	  }
  
	  try {
		this.logger.debug('Attempting to refresh tokens');
		const payload = await this.verifyRefreshToken(refreshToken);
		const user = await this.userService.getById(payload.id);
  
		if (!user) {
		  this.logger.warn(`User not found for refresh token: ${payload.id}`);
		  throw new UnauthorizedException('Пользователь не найден');
		}
  
		const tokens = await this.generateTokens(user.id);
		this.logger.debug(`Tokens refreshed successfully for user ${user.email}`);
		return tokens;
	  } catch (error) {
		this.logger.error(`Refresh token failed: ${error.message}`);
		throw new UnauthorizedException('Недействительный или просроченный refresh token');
	  }
	}
  
	addRefreshTokenToResponse(res: Response, refreshToken: string): void {
		const expiresIn = new Date();
		expiresIn.setDate(expiresIn.getDate() + 7); // 7 дней
	  
		res.cookie(this.REFRESH_TOKEN_NAME, refreshToken, {
		  httpOnly: true,
		  domain: this.configService.get('SERVER_DOMAIN', 'localhost'),
		  expires: expiresIn,
		  secure: this.configService.get('NODE_ENV') === 'production',
		  sameSite: 'lax', // Изменено с 'strict'
		  path: '/', // Важно: установите корневой путь
		});
	  }
  
	removeRefreshTokenFromResponse(res: Response): void {
	  res.cookie(this.REFRESH_TOKEN_NAME, '', {
		httpOnly: true,
		domain: this.configService.get('SERVER_DOMAIN', 'localhost'),
		expires: new Date(0),
		secure: this.configService.get('NODE_ENV') === 'production',
		sameSite: 'strict',
		path: '/auth/refresh',
	  });
  
	 //this.logger.debug('Refresh token removed from response');
	}
  
	private async generateTokens(userId: string): Promise<{
	  accessToken: string;
	  refreshToken: string;
	}> {
	  try {
		const payload = { id: userId };
  
		const [accessToken, refreshToken] = await Promise.all([
		  this.jwtService.signAsync(payload, {
			secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
			expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
		  }),
		  this.jwtService.signAsync(payload, {
			secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
			expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
		  }),
		]);
  
		return { accessToken, refreshToken };
	  } catch (error) {
		this.logger.error(`Token generation failed: ${error.message}`);
		throw new InternalServerErrorException('Ошибка генерации токенов');
	  }
	}
  
	
	private async verifyRefreshToken(token: string): Promise<{ id: string }> {
	  try {
		return await this.jwtService.verifyAsync(token, {
		  secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
		});
	  } catch (error) {
		this.logger.error(`Refresh token verification failed: ${error.message}`);
		throw new UnauthorizedException('Недействительный refresh token');
	  }
	}
  
		 excludeSensitiveFields(user: User): Omit<User, 'password'> {
	  const { password, ...result } = user;
	  return result;
	}
  
	private handleAuthError(error: any): never {
	  if (
		error instanceof BadRequestException ||
		error instanceof NotFoundException ||
		error instanceof UnauthorizedException
	  ) {
		throw error;
	  }
  
	  this.logger.error(`Auth error: ${error.message}`);
	  throw new InternalServerErrorException('Ошибка аутентификации');
	}
  }