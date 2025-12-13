import {
	Body,
	Controller,
	Post,
	HttpCode,
	Req,
	Res,
	UnauthorizedException,
	UsePipes,
	ValidationPipe,
	BadRequestException,
	NotFoundException,
	UseGuards,
	Get,
	Logger,
  } from '@nestjs/common';
  import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiBody,
	ApiCookieAuth,
	ApiBadRequestResponse,
	ApiUnauthorizedResponse,
  } from '@nestjs/swagger';
  import { Request, Response } from 'express';
  import { AuthService } from './auth.service';
  import { AuthDto, RegisterDto } from './dto/auth.dto';
  import { LoginResponseDto } from './dto/login-response.dto';
  import { RefreshResponseDto } from './dto/refresh-response.dto';
  import * as argon2 from 'argon2'
  import { UserService } from 'src/user/user.service';
  import {UserResponseDto} from 'src/user/dto/user-response.dto'
  import {JwtAuthGuard} from'src/auth/guards/jwt-auth.guard'
  
  @ApiTags('Аутентификация')
  @Controller('auth')
  export class AuthController {
	private readonly logger = new Logger(AuthController.name);
	readonly REFRESH_TOKEN_NAME = 'refreshToken';
	readonly ACCESS_TOKEN_EXPIRES_IN = '1d';
	readonly REFRESH_TOKEN_EXPIRES_IN = '7d';

	constructor(
		private readonly userService: UserService,
		private readonly authService: AuthService
	) {}
	
	@Get('me')
	@UseGuards(JwtAuthGuard)
	@ApiOperation({ summary: 'Получение информации о текущем пользователе' })
	@ApiCookieAuth('refreshToken')
	@ApiResponse({
		status: 200,
		description: 'Успешное получение информации о пользователе',
		type: UserResponseDto,
	})
	@ApiUnauthorizedResponse({ description: 'Пользователь не авторизован' })
	async getCurrentUser(@Req() req: Request) {
		try {
		const userId = req.user['id'];
		//this.logger.log(`Запрос данных пользователя с ID: ${userId}`);
		const user = await this.userService.getById(userId);
		//this.logger.log(user)
		if (!user) {
			throw new NotFoundException('Пользователь не найден');
		}

		return this.authService.excludeSensitiveFields(user);
		} catch (error) {
		this.logger.error(
			`Ошибка при получении данных пользователя: ${error.message}`,
		);
		throw new UnauthorizedException(
			'Не удалось получить данные пользователя',
		);
		}
	}
  
	@Post('login')
	@UsePipes(new ValidationPipe({ transform: true }))
	@HttpCode(200)
	@ApiOperation({ summary: 'Вход в систему' })
	@ApiBody({ type: AuthDto, description: 'Данные для входа' })
	@ApiResponse({
	  status: 200,
	  description: 'Успешный вход',
	  type: LoginResponseDto,
	  headers: {
		'Set-Cookie': {
		  description: 'Устанавливает refreshToken в cookie',
		},
	  },
	})
	@ApiBadRequestResponse({ description: 'Некорректные данные' })
	@ApiUnauthorizedResponse({ description: 'Неверные учетные данные' })
	async login(
	  @Body() dto: AuthDto,
	  @Res({ passthrough: true }) res: Response,
	): Promise<Omit<LoginResponseDto, 'refreshToken'>> {
	  try {
		this.logger.log(`Login attempt for user: ${dto.email}`);
		const { refreshToken, ...response } = await this.authService.login(dto);
		this.authService.addRefreshTokenToResponse(res, refreshToken);
		this.logger.log(`User ${dto.email} logged in successfully`);
		return response;
	  } catch (error) {
		this.logger.error(`Login failed for user ${dto.email}: ${error.message}`);
		if (error instanceof BadRequestException) {
		  throw new BadRequestException(error.message);
		}
		throw new UnauthorizedException('Неверные учетные данные');
	  }
	}
  
	@Post('register')
	@UsePipes(new ValidationPipe({ transform: true }))
	@HttpCode(200)
	@ApiOperation({ summary: 'Регистрация нового пользователя' })
	@ApiBody({ type: RegisterDto, description: 'Данные для регистрации' })
	@ApiResponse({
	status: 200,
	description: 'Успешная регистрация',
	type: LoginResponseDto, // Возвращаем токены и информацию о пользователе
	})
	async register(
	@Body() dto: RegisterDto,
	@Res({ passthrough: true }) res: Response,
	): Promise<Omit<LoginResponseDto, 'refreshToken'>> {
	try {
		const { refreshToken, ...response } = await this.authService.register(dto);
		this.authService.addRefreshTokenToResponse(res, refreshToken);
		return response;
	} catch (error) {
			this.logger.error(`Registration failed for user ${dto.email}: ${error.message}`);
			throw new BadRequestException(
			  error.message || 'Пользователь с таким email уже существует',
			);
		  }
	}
  
	@Post('refresh')
	@HttpCode(200)
	async refreshTokens(
	@Req() req: Request,
	@Res({ passthrough: true }) res: Response,
	): Promise<Omit<RefreshResponseDto, 'refreshToken'>> {
	// 1. Получаем refreshToken из кук
	const refreshToken = req.cookies?.[this.authService.REFRESH_TOKEN_NAME];
	
	if (!refreshToken) {
		//this.logger.warn('Refresh token not found in cookies');
		this.authService.removeRefreshTokenFromResponse(res);
		throw new UnauthorizedException('Refresh token не предоставлен');
	}

	try {
		const { refreshToken: newRefreshToken, ...response } = 
		await this.authService.refreshTokens(refreshToken);
		
		this.authService.addRefreshTokenToResponse(res, newRefreshToken);
		
		this.logger.log('Tokens refreshed successfully');
		return response;
	} catch (error) {
		this.logger.error(`Refresh failed: ${error.message}`);
		this.authService.removeRefreshTokenFromResponse(res);
		throw new UnauthorizedException('Недействительный refresh token');
	}
	}
  
	@Post('logout')
	@HttpCode(200)
	@ApiCookieAuth('refreshToken')  
	@ApiOperation({ summary: 'Выход из системы' })
	@ApiResponse({
	  status: 200,
	  description: 'Успешный выход',
	  headers: {
		'Set-Cookie': {
		  description: 'Удаляет refreshToken из cookie',
		},
	  },
	})
	async logout(@Res({ passthrough: true }) res: Response): Promise<{ success: boolean }> {
	  this.logger.log('User logout');
	  this.authService.removeRefreshTokenFromResponse(res);
	  return { success: true };
	}

	
}