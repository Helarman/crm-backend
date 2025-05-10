import { Controller, Get, Param, Patch, Body, Query, BadRequestException, Logger,Delete} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiParam,
  ApiNotFoundResponse
} from '@nestjs/swagger';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { CurrentUser } from './decorators/user.decorator';
import { UserService } from './user.service';
import { EnumUserRoles } from '@prisma/client';
import { UpdateRoleDto } from './dto/update-role.dto';
import { $Enums } from '@prisma/client';

@ApiTags('Пользователи')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  private readonly logger = new Logger(UserController.name);

  @Auth()
  @Get('profile')
  @ApiOperation({ summary: 'Получить профиль текущего пользователя' })
  @ApiOkResponse({ description: 'Профиль пользователя успешно получен' })
  @ApiUnauthorizedResponse({ description: 'Пользователь не авторизован' })
  async getProfile(@CurrentUser('id') id: string) {
    return this.userService.getById(id);
  }
  
  @Auth()
  @Get()
  @ApiOperation({ summary: 'Получить список всех пользователей' })
  @ApiOkResponse({ description: 'Список пользователей успешно получен' })
  @ApiUnauthorizedResponse({ description: 'Пользователь не авторизован' })
  async getAll() {
    return this.userService.getAll();
  }

  @Auth()
  @Get('email/:email')
  @ApiOperation({ summary: 'Получить пользователя по email' })
  @ApiParam({ name: 'email', description: 'Email пользователя' })
  @ApiOkResponse({ description: 'Пользователь успешно найден' })
  @ApiNotFoundResponse({ description: 'Пользователь не найден' })
  @ApiUnauthorizedResponse({ description: 'Пользователь не авторизован' })
  async getByEmail(@Param('email') email: string) {
    return this.userService.getByEmail(email);
  }

  @Auth()
  @Get(':id')
  @ApiOperation({ summary: 'Получить пользователя по ID' })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  @ApiOkResponse({ description: 'Пользователь успешно найден' })
  @ApiNotFoundResponse({ description: 'Пользователь не найден' })
  @ApiUnauthorizedResponse({ description: 'Пользователь не авторизован' })
  async getById(@Param('id') id: string) {
    return this.userService.getById(id);
  }

  @Auth()
  @Delete(':id')
  @ApiOperation({ summary: 'Удалить пользователя по ID' })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  @ApiOkResponse({ description: 'Пользователь успешно удален' })
  @ApiNotFoundResponse({ description: 'Пользователь не найден' })
  @ApiUnauthorizedResponse({ description: 'Пользователь не авторизован' })
  async delete(@Param('id') id: string) {
    return this.userService.delete(id);
  }


  @Auth()
  @Patch(':id/role')
  @ApiOperation({ summary: 'Изменить роль пользователя' })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  @ApiOkResponse({ description: 'Роль пользователя успешно изменена' })
  @ApiNotFoundResponse({ description: 'Пользователь не найден' })
  @ApiUnauthorizedResponse({ description: 'Пользователь не авторизован' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.userService.updateRole(id, dto.role);
  }
  
}