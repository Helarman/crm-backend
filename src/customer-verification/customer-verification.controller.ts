import { Body, Controller, Post, HttpCode, Param, Get, Query, Patch } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CustomerVerificationService } from './customer-verification.service';
import { RequestCodeDto } from './dto/request-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { VerifyCodeResponseDto } from './dto/verify-code-response.dto';
import { CustomerDto } from './dto/customer.dto';
import { UpdateBonusPointsDto } from './dto/update-bonus-points.dto';
import { IncrementBonusPointsDto } from './dto/increment-bonus-points.dto';
import { ShortCodeResponseDto } from './dto/short-code-response.dto';
import { UpdatePersonalDiscountDto } from './dto/update-personal-discount.dto';

@ApiTags('Верификация клиента')
@Controller('customer-verification')
export class CustomerVerificationController {
  constructor(
    private readonly verificationService: CustomerVerificationService
  ) {}

  @Get('customers')
  @ApiOperation({ 
    summary: 'Получение списка клиентов', 
    description: 'Возвращает список клиентов с пагинацией' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Список клиентов успешно получен',
    schema: {
      example: {
        data: [
          {
            id: 'clxyz...',
            phone: '79991234567',
            bonusPoints: 100,
            createdAt: '2023-01-01T00:00:00.000Z',
            lastLogin: '2023-01-02T00:00:00.000Z'
          }
        ],
        pagination: {
          total: 100,
          page: 1,
          limit: 10,
          totalPages: 10
        }
      }
    }
  })
  async getAllCustomers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.verificationService.getAllCustomers(page, limit);
  }

  @Post('request-code')
  @HttpCode(200)
  @ApiOperation({ 
    summary: 'Запрос кода подтверждения', 
    description: 'Отправляет SMS с кодом подтверждения на указанный номер телефона' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Код подтверждения успешно отправлен',
    schema: {
      example: {
        success: true
      }
    }
  })
  async requestVerificationCode(@Body() dto: RequestCodeDto) {
    return this.verificationService.requestCode(dto.phone);
  }

  @Post('verify-code')
  @HttpCode(200)
  @ApiOperation({ 
    summary: 'Проверка кода', 
    description: 'Проверяет код, отправленный на номер телефона клиента' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Код успешно подтвержден',
    type: VerifyCodeResponseDto
  })
  async verifyCode(@Body() dto: VerifyCodeDto) {
    return this.verificationService.verifyCode(dto.phone, dto.code);
  }

  @Post('refresh-token')
  @HttpCode(200)
  @ApiOperation({ 
    summary: 'Обновление токена доступа', 
    description: 'Генерирует новый access token с помощью refresh token' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Токены успешно обновлены',
    schema: {
      example: {
        accessToken: 'новый.jwt.access.token',
        refreshToken: 'новый.jwt.refresh.token'
      }
    }
  })
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.verificationService.refreshTokens(refreshToken);
  }

  @Get('customer/:phone')
  @ApiOperation({ 
    summary: 'Получение информации о клиенте', 
    description: 'Возвращает информацию о клиенте по номеру телефона' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Информация о клиенте успешно получена',
    type: CustomerDto
  })
  async getCustomerByPhone(@Param('phone') phone: string) {
    return this.verificationService.getCustomerByPhone(phone);
  }

  @Patch('customer/:id/bonus-points')
  @HttpCode(200)
  @ApiOperation({ 
    summary: 'Обновление бонусных баллов', 
    description: 'Устанавливает новое значение бонусных баллов' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Бонусные баллы успешно обновлены',
    type: CustomerDto
  })
  async updateBonusPoints(
    @Param('id') customerId: string,
    @Body() dto: UpdateBonusPointsDto
  ) {
    return this.verificationService.updateBonusPoints(customerId, dto.bonusPoints);
  }

  @Patch('customer/:id/bonus-points/increment')
  @HttpCode(200)
  @ApiOperation({ 
    summary: 'Изменение бонусных баллов', 
    description: 'Добавляет или вычитает указанное количество бонусных баллов' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Бонусные баллы успешно изменены',
    type: CustomerDto
  })
  async incrementBonusPoints(
    @Param('id') customerId: string,
    @Body() dto: IncrementBonusPointsDto
  ) {
    return this.verificationService.incrementBonusPoints(customerId, dto.points);
  }

  @Post('customer/:id/short-code')
  @HttpCode(200)
  @ApiOperation({ 
    summary: 'Генерация нового 4-символьного кода', 
    description: 'Генерирует новый 4-символьный код, действительный 2 минуты' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Код успешно сгенерирован',
    type: ShortCodeResponseDto
  })
  async generateShortCode(@Param('id') customerId: string) {
    return this.verificationService.generateNewShortCode(customerId);
  }

  @Get('short-code/:code')
  @ApiOperation({ 
    summary: 'Получение клиента по 4-символьному коду', 
    description: 'Возвращает информацию о клиенте по 4-символьному коду (действителен 2 минуты)' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Информация о клиенте успешно получена',
    type: CustomerDto
  })
  async getCustomerByShortCode(@Param('code') code: string) {
    return this.verificationService.getCustomerByShortCode(code);
  }

  @Patch('customer/:id/personal-discount')
  @HttpCode(200)
  @ApiOperation({ 
    summary: 'Обновление персональной скидки', 
    description: 'Устанавливает новое значение персональной скидки (0-100%)' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Персональная скидка успешно обновлена',
    type: CustomerDto
  })
  async updatePersonalDiscount(
    @Param('id') customerId: string,
    @Body() dto: UpdatePersonalDiscountDto
  ) {
    return this.verificationService.updatePersonalDiscount(customerId, dto.discount);
  }
  
}