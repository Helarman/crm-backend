import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationQueryDto } from './dto/reservation-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  
  
  @ApiOperation({ summary: 'Создать новое бронирование' })
  @ApiResponse({ status: 201, description: 'Бронирование успешно создано' })
  @ApiResponse({ status: 400, description: 'Неверные данные или стол занят' })
  @ApiResponse({ status: 404, description: 'Стол не найден' })
  async createReservation(@Body() createReservationDto: CreateReservationDto) {
    return this.reservationsService.createReservation(createReservationDto);
  }

  @Get()
  
  @ApiOperation({ summary: 'Получить список бронирований с фильтрацией' })
  getReservations(@Query() query: ReservationQueryDto) {
    return this.reservationsService.getReservations(query);
  }

  @Get('upcoming/:restaurantId')
  
  
  @ApiOperation({ summary: 'Получить предстоящие бронирования ресторана' })
  @ApiQuery({ name: 'hours', required: false, type: Number, description: 'Количество часов вперед (по умолчанию 24)' })
  getUpcomingReservations(
    @Param('restaurantId') restaurantId: string,
    @Query('hours') hours: number = 24,
  ) {
    return this.reservationsService.getUpcomingReservations(restaurantId, hours);
  }

  @Get(':id')
  
  
  @ApiOperation({ summary: 'Получить бронирование по ID' })
  @ApiResponse({ status: 404, description: 'Бронирование не найдено' })
  getReservationById(@Param('id') id: string) {
    return this.reservationsService.getReservationById(id);
  }

  @Patch(':id')
  
  
  @ApiOperation({ summary: 'Обновить бронирование' })
  @ApiResponse({ status: 404, description: 'Бронирование не найдено' })
  updateReservation(
    @Param('id') id: string,
    @Body() updateReservationDto: UpdateReservationDto,
  ) {
    return this.reservationsService.updateReservation(id, updateReservationDto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  
  
  @ApiOperation({ summary: 'Отменить бронирование' })
  @ApiResponse({ status: 200, description: 'Бронирование успешно отменено' })
  @ApiResponse({ status: 404, description: 'Бронирование не найдено' })
  cancelReservation(@Param('id') id: string) {
    return this.reservationsService.cancelReservation(id);
  }

  @Post(':id/arrived')
  @HttpCode(HttpStatus.OK)
  
  
  @ApiOperation({ summary: 'Отметить клиента как прибывшего' })
  @ApiResponse({ status: 200, description: 'Статус успешно обновлен' })
  @ApiResponse({ status: 404, description: 'Бронирование не найдено' })
  markAsArrived(@Param('id') id: string) {
    return this.reservationsService.markAsArrived(id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  
  
  @ApiOperation({ summary: 'Завершить бронирование (клиент ушел)' })
  @ApiResponse({ status: 200, description: 'Бронирование завершено' })
  @ApiResponse({ status: 404, description: 'Бронирование не найдено' })
  completeReservation(@Param('id') id: string) {
    return this.reservationsService.completeReservation(id);
  }

  @Post(':id/no-show')
  @HttpCode(HttpStatus.OK)
  
  
  @ApiOperation({ summary: 'Отметить клиента как неявившегося' })
  @ApiResponse({ status: 200, description: 'Статус успешно обновлен' })
  @ApiResponse({ status: 404, description: 'Бронирование не найдено' })
  markAsNoShow(@Param('id') id: string) {
    return this.reservationsService.markAsNoShow(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  
  
  @ApiOperation({ summary: 'Удалить бронирование' })
  @ApiResponse({ status: 404, description: 'Бронирование не найдено' })
  @ApiResponse({ status: 400, description: 'Нельзя удалить активное бронирование' })
  deleteReservation(@Param('id') id: string) {
    return this.reservationsService.deleteReservation(id);
  }

  @Get('statistics/restaurant/:restaurantId')
  
  
  @ApiOperation({ summary: 'Получить статистику бронирований ресторана' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  getReservationStatistics(
    @Param('restaurantId') restaurantId: string,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    return this.reservationsService.getReservationStatistics(restaurantId, startDate, endDate);
  }
    @Get('table/:tableId')
  
  
  @ApiOperation({ summary: 'Получить все бронирования стола' })
  @ApiQuery({ name: 'status', required: false, enum: ['CONFIRMED', 'PENDING', 'ARRIVED', 'CANCELLED', 'NO_SHOW', 'COMPLETED'] })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'onlyActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getReservationsByTable(
    @Param('tableId') tableId: string,
    @Query() query?: ReservationQueryDto,
  ) {
    return this.reservationsService.getReservationsByTable(tableId, query);
  }

  @Get('table/:tableId/current')
  
  
  @ApiOperation({ summary: 'Получить текущее бронирование стола (ближайшее ±2 часа)' })
  @ApiResponse({ status: 200, description: 'Текущее бронирование' })
  @ApiResponse({ status: 204, description: 'Нет текущих бронирований' })
  async getCurrentReservationByTable(@Param('tableId') tableId: string) {
    const reservation = await this.reservationsService.getCurrentReservationByTable(tableId);
    if (!reservation) {
      return null; // Возвращаем null вместо 404, так как текущее бронирование может отсутствовать
    }
    return reservation;
  }

  @Get('table/:tableId/upcoming')
  
  
  @ApiOperation({ summary: 'Получить предстоящие бронирования стола' })
  @ApiQuery({ name: 'hours', required: false, type: Number, description: 'Количество часов вперед (по умолчанию 24)' })
  getUpcomingReservationsByTable(
    @Param('tableId') tableId: string,
    @Query('hours') hours: number = 24,
  ) {
    return this.reservationsService.getUpcomingReservationsByTable(tableId, hours);
  }

  @Get('table/:tableId/history')
  
  
  @ApiOperation({ summary: 'Получить историю бронирований стола' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Количество дней истории (по умолчанию 30)' })
  getTableReservationHistory(
    @Param('tableId') tableId: string,
    @Query('days') days: number = 30,
  ) {
    return this.reservationsService.getTableReservationHistory(tableId, days);
  }

 
}