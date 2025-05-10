// src/shift/shift.controller.ts
import {
    Body,
    Controller,
    Post,
    Put,
    Param,
    Get,
    Delete,
    HttpCode,
    Query
  } from '@nestjs/common';
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBody,
    ApiParam,
    ApiBearerAuth,
    ApiQuery,
  } from '@nestjs/swagger';
  import { ShiftService } from './shift.service';
  import { CreateShiftDto } from './dto/create-shift.dto';
  import { UpdateShiftStatusDto } from './dto/update-shift-status.dto';
  import { ManageShiftUserDto } from './dto/manage-shift-user.dto';
  import { ManageShiftOrderDto } from './dto/manage-shift-order.dto';
import { GetShiftsDto } from './dto/get-shifts.dto';
  
  
  @ApiTags('Смены')
  @ApiBearerAuth()
  @Controller('shifts')
  export class ShiftController {
    constructor(private readonly shiftService: ShiftService) {}
  
    
    @Get()
    @ApiOperation({ summary: 'Получить список всех смен' })
    @ApiQuery({ name: 'restaurantId', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, type: String })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Список смен получен успешно' })
    async getAll(@Query() query: GetShiftsDto) {
        return this.shiftService.getAllShifts(query);
    }

    @Post()
    @HttpCode(201)
    @ApiOperation({ summary: 'Создать новую смену' })
    @ApiBody({ type: CreateShiftDto })
    @ApiResponse({ status: 201, description: 'Смена успешно создана' })
    @ApiResponse({ status: 404, description: 'Ресторан не найден' })
    async create(@Body() dto: CreateShiftDto) {
      return this.shiftService.createShift(dto);
    }
  
    @Put(':id/status')
    @HttpCode(200)
    @ApiOperation({ summary: 'Обновить статус смены' })
    @ApiParam({ name: 'id', description: 'ID смены' })
    @ApiBody({ type: UpdateShiftStatusDto })
    @ApiResponse({ status: 200, description: 'Статус смены обновлен' })
    @ApiResponse({ status: 404, description: 'Смена не найдена' })
    async updateStatus(
      @Param('id') shiftId: string,
      @Body() dto: UpdateShiftStatusDto,
    ) {
      return this.shiftService.updateShiftStatus(shiftId, dto);
    }
  
    @Post(':id/users')
    @HttpCode(200)
    @ApiOperation({ summary: 'Добавить пользователя в смену' })
    @ApiParam({ name: 'id', description: 'ID смены' })
    @ApiBody({ type: ManageShiftUserDto })
    @ApiResponse({ status: 200, description: 'Пользователь добавлен в смену' })
    @ApiResponse({ status: 404, description: 'Смена или пользователь не найдены' })
    @ApiResponse({ status: 409, description: 'Пользователь уже в смене' })
    async addUser(
      @Param('id') shiftId: string,
      @Body() dto: ManageShiftUserDto,
    ) {
      return this.shiftService.addUserToShift(shiftId, dto);
    }
  
    @Delete(':shiftId/users/:userId')
    @HttpCode(200)
    @ApiOperation({ summary: 'Удалить пользователя из смены' })
    @ApiParam({ name: 'shiftId', description: 'ID смены' })
    @ApiParam({ name: 'userId', description: 'ID пользователя' })
    @ApiResponse({ status: 200, description: 'Пользователь удален из смены' })
    @ApiResponse({ status: 404, description: 'Пользователь не найден в смене' })
    async removeUser(
      @Param('shiftId') shiftId: string,
      @Param('userId') userId: string,
    ) {
      return this.shiftService.removeUserFromShift(shiftId, userId);
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Получить детали смены' })
    @ApiParam({ name: 'id', description: 'ID смены' })
    @ApiResponse({ status: 200, description: 'Детали смены' })
    @ApiResponse({ status: 404, description: 'Смена не найдена' })
    async getDetails(@Param('id') shiftId: string) {
      return this.shiftService.getShiftDetails(shiftId);
    }

    @Get('restaurant/:restaurantId/active')
    @ApiOperation({ summary: 'Получить активные смены ресторана' })
    @ApiParam({ name: 'restaurantId', description: 'ID ресторана' })
    @ApiResponse({ status: 200, description: 'Активные смены ресторана' })
    @ApiResponse({ status: 404, description: 'Ресторан не найден' })
    async getActiveShiftsByRestaurant(@Param('restaurantId') restaurantId: string) {
      return this.shiftService.getActiveShiftsByRestaurant(restaurantId);
    }
  }