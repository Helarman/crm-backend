import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody, 
  ApiParam, 
  ApiBearerAuth
} from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import { CreateNetworkDto } from './dto/create-network.dto';
import { UpdateNetworkDto } from './dto/update-network.dto';
import { NetworkService } from './network.service';

@ApiTags('Сети ресторанов')
@ApiBearerAuth()
@Controller('networks')
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Get()
  @ApiOperation({ summary: 'Получить все сети ресторанов' })
  @ApiResponse({ status: 200, description: 'Список сетей' })
  async getAll() {
    return this.networkService.getAll();
  }

  @Post()
  @UsePipes(new ValidationPipe())
  @ApiOperation({ summary: 'Создать новую сеть ресторанов' })
  @ApiBody({ type: CreateNetworkDto })
  @ApiResponse({ status: 201, description: 'Сеть создана' })
  async create(@Body() dto: CreateNetworkDto) {
    return this.networkService.create(dto);
  }

  @Put(':id')
  @UsePipes(new ValidationPipe())
  @ApiOperation({ summary: 'Обновить сеть ресторанов' })
  @ApiParam({ name: 'id', description: 'ID сети' })
  @ApiBody({ type: UpdateNetworkDto })
  @ApiResponse({ status: 200, description: 'Сеть обновлена' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateNetworkDto
  ) {
    return this.networkService.update(id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить сеть по ID' })
  @ApiParam({ name: 'id', description: 'ID сети' })
  @ApiResponse({ status: 200, description: 'Сеть найдена' })
  async getById(@Param('id') id: string) {
    return this.networkService.getById(id);
  }

  @Get(':id/restaurants')
  @ApiOperation({ summary: 'Получить рестораны сети' })
  @ApiParam({ name: 'id', description: 'ID сети' })
  @ApiResponse({ status: 200, description: 'Список ресторанов' })
  async getRestaurants(@Param('id') id: string) {
    return this.networkService.getRestaurants(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Получить сети по ID пользователя' })
  @ApiParam({ name: 'userId', description: 'ID пользователя' })
  @ApiResponse({ status: 200, description: 'Список сетей пользователя' })
  async getNetworksByUser(@Param('userId') userId: string) {
    return this.networkService.getNetworksByUser(userId);
  }


  @Delete(':id')
  @ApiOperation({ summary: 'Удалить сеть ресторанов' })
  @ApiParam({ name: 'id', description: 'ID сети' })
  @ApiResponse({ status: 200, description: 'Сеть удалена' })
  async delete(@Param('id') id: string) {
    return this.networkService.delete(id);
  }
}