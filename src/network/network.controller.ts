import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
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
import { ToggleNetworkBlockDto } from './dto/toggle-network-block.dto';
import { UpdateNetworkBalanceDto } from './dto/update-network-balance.dto';
import { CreateNetworkTariffDto } from './dto/create-network-tariff.dto';
import { UpdateNetworkTariffDto } from './dto/update-network-tariff.dto';
import { GetNetworkTransactionsDto } from './dto/get-network-transactions.dto';

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

    @Put(':id/balance')
  @UsePipes(new ValidationPipe())
  @ApiOperation({ summary: 'Изменить баланс сети' })
  @ApiParam({ name: 'id', description: 'ID сети' })
  @ApiBody({ type: UpdateNetworkBalanceDto })
  @ApiResponse({ status: 200, description: 'Баланс сети обновлен' })
  @ApiResponse({ status: 400, description: 'Недостаточно средств' })
  async updateBalance(
    @Param('id') id: string,
    @Body() dto: UpdateNetworkBalanceDto
  ) {
    return this.networkService.updateBalance(id, dto);
  }

  @Put(':id/block')
  @UsePipes(new ValidationPipe())
  @ApiOperation({ summary: 'Заблокировать/разблокировать сеть' })
  @ApiParam({ name: 'id', description: 'ID сети' })
  @ApiBody({ type: ToggleNetworkBlockDto })
  @ApiResponse({ status: 200, description: 'Статус блокировки обновлен' })
  async toggleBlock(
    @Param('id') id: string,
    @Body() dto: ToggleNetworkBlockDto
  ) {
    return this.networkService.toggleBlock(id, dto);
  }

   @Get('tariffs/all')
  @ApiOperation({ summary: 'Получить все тарифы' })
  @ApiResponse({ status: 200, description: 'Список всех тарифов' })
  async getAllTariffs() {
    return this.networkService.getAllTariffs();
  }

  @Get('tariffs/:tariffId')
  @ApiOperation({ summary: 'Получить тариф по ID' })
  @ApiParam({ name: 'tariffId', description: 'ID тарифа' })
  @ApiResponse({ status: 200, description: 'Тариф найден' })
  async getTariffById(@Param('tariffId') tariffId: string) {
    return this.networkService.getTariffById(tariffId);
  }

  @Post('tariffs')
  @UsePipes(new ValidationPipe())
  @ApiOperation({ summary: 'Создать новый тариф' })
  @ApiBody({ type: CreateNetworkTariffDto })
  @ApiResponse({ status: 201, description: 'Тариф создан' })
  async createTariff(@Body() dto: CreateNetworkTariffDto) {
    return this.networkService.createTariff(dto);
  }

  @Put('tariffs/:tariffId')
  @UsePipes(new ValidationPipe())
  @ApiOperation({ summary: 'Обновить тариф' })
  @ApiParam({ name: 'tariffId', description: 'ID тарифа' })
  @ApiBody({ type: UpdateNetworkTariffDto })
  @ApiResponse({ status: 200, description: 'Тариф обновлен' })
  async updateTariff(
    @Param('tariffId') tariffId: string,
    @Body() dto: UpdateNetworkTariffDto
  ) {
    return this.networkService.updateTariff(tariffId, dto);
  }

  @Delete('tariffs/:tariffId')
  @ApiOperation({ summary: 'Удалить тариф' })
  @ApiParam({ name: 'tariffId', description: 'ID тарифа' })
  @ApiResponse({ status: 200, description: 'Тариф удален' })
  async deleteTariff(@Param('tariffId') tariffId: string) {
    return this.networkService.deleteTariff(tariffId);
  }

  @Get('tariffs/:tariffId/networks')
  @ApiOperation({ summary: 'Получить сети, использующие тариф' })
  @ApiParam({ name: 'tariffId', description: 'ID тарифа' })
  @ApiResponse({ status: 200, description: 'Список сетей' })
  async getNetworksByTariff(@Param('tariffId') tariffId: string) {
    return this.networkService.getNetworksByTariff(tariffId);
  }


  @Put(':networkId/tariff/:tariffId')
  @ApiOperation({ summary: 'Назначить тариф сети' })
  @ApiParam({ name: 'networkId', description: 'ID сети' })
  @ApiParam({ name: 'tariffId', description: 'ID тарифа' })
  @ApiResponse({ status: 200, description: 'Тариф назначен сети' })
  async assignTariffToNetwork(
    @Param('networkId') networkId: string,
    @Param('tariffId') tariffId: string
  ) {
    return this.networkService.assignTariffToNetwork(networkId, tariffId);
  }

  @Delete(':networkId/tariff')
  @ApiOperation({ summary: 'Убрать тариф у сети' })
  @ApiParam({ name: 'networkId', description: 'ID сети' })
  @ApiResponse({ status: 200, description: 'Тариф убран у сети' })
  async removeTariffFromNetwork(@Param('networkId') networkId: string) {
    return this.networkService.removeTariffFromNetwork(networkId);
  }
   @Get(':id/transactions')
  @ApiOperation({ summary: 'Получить транзакции сети' })
  @ApiParam({ name: 'id', description: 'ID сети' })
  @ApiResponse({ status: 200, description: 'Список транзакций' })
  @ApiResponse({ status: 404, description: 'Сеть не найдена' })
  async getNetworkTransactions(
    @Param('id') id: string,
    @Query() dto: GetNetworkTransactionsDto
  ) {
    return this.networkService.getNetworkTransactions(id, dto);
  }
}