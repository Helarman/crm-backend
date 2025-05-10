import { Body, Controller, Post, HttpCode, Param, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CustomerVerificationService } from './customer-verification.service';
import { RequestCodeDto } from './dto/request-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { VerifyCodeResponseDto } from './dto/verify-code-response.dto';
import { CustomerDto } from './dto/customer.dto'

// Группировка всех эндпоинтов верификации под одним тегом в Swagger
@ApiTags('Верификация клиента')
@Controller('customer-verification')
export class CustomerVerificationController {
  constructor(
    private readonly verificationService: CustomerVerificationService
  ) {}

  // Эндпоинт для запроса SMS с кодом подтверждения
  @Post('request-code')
  @HttpCode(200) // Явно указываем код ответа 200 при успехе
  @ApiOperation({ 
    summary: 'Запрос кода подтверждения', 
    description: 'Отправляет SMS с кодом подтверждения на указанный номер телефона' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Код подтверждения успешно отправлен',
    schema: {
      example: {
        success: true,
        message: 'Код подтверждения отправлен'
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Неверный формат номера телефона',
    schema: {
      example: {
        success: false,
        message: 'Неверный формат номера телефона'
      }
    }
  })
  @ApiResponse({
    status: 429,
    description: 'Слишком много попыток запроса кода',
    schema: {
      example: {
        success: false,
        message: 'Слишком много попыток. Попробуйте позже'
      }
    }
  })
  async requestVerificationCode(@Body() dto: RequestCodeDto) {
    return this.verificationService.requestCode(dto.phone);
  }

  // Эндпоинт для проверки введенного кода подтверждения
  @Post('verify-code')
  @HttpCode(200)
  @ApiOperation({ 
    summary: 'Проверка кода', 
    description: 'Проверяет код, отправленный на номер телефона клиента' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Код успешно подтвержден',
    type: VerifyCodeResponseDto // Используем типизированный DTO для ответа
  })
  @ApiResponse({
    status: 400,
    description: 'Неверный или просроченный код подтверждения',
    schema: {
      example: {
        success: false,
        message: 'Неверный или просроченный код'
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Номер телефона не найден или код не запрашивался',
    schema: {
      example: {
        success: false,
        message: 'Данные для верификации не найдены'
      }
    }
  })
  async verifyCode(@Body() dto: VerifyCodeDto) {
    return this.verificationService.verifyCode(dto.phone, dto.code);
  }

  // Эндпоинт для обновления JWT токенов
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
  @ApiResponse({
    status: 401,
    description: 'Неверный или просроченный refresh token',
    schema: {
      example: {
        success: false,
        message: 'Неверный refresh token'
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
  @ApiResponse({
    status: 404,
    description: 'Клиент с указанным номером телефона не найден',
    schema: {
      example: {
        success: false,
        message: 'Клиент не найден'
      }
    }
  })
  async getCustomerByPhone(@Param('phone') phone: string) {
    return this.verificationService.getCustomerByPhone(phone);
  }
}