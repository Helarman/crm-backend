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
import { TablesService } from './tables.service';
import { CreateHallDto } from './dto/create-hall.dto';
import { UpdateHallDto } from './dto/update-hall.dto';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { CreateTableTagDto } from './dto/create-table-tag.dto';
import { UpdateTableTagDto } from './dto/update-table-tag.dto';
import { CombineTablesDto } from './dto/combine-tables.dto';
import { TableQueryDto } from './dto/table-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('tables')
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  // ========== ЗАЛЫ ==========

  @Post('halls')
  @ApiOperation({ summary: 'Создать новый зал' })
  @ApiResponse({ status: 201, description: 'Зал успешно создан' })
  @ApiResponse({ status: 400, description: 'Неверные данные' })
  @ApiResponse({ status: 404, description: 'Ресторан не найден' })
  createHall(@Body() createHallDto: CreateHallDto) {
    return this.tablesService.createHall(createHallDto);
  }

  @Get('halls/restaurant/:restaurantId')
  @ApiOperation({ summary: 'Получить все залы ресторана' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  getHallsByRestaurant(
    @Param('restaurantId') restaurantId: string,
    @Query('includeInactive') includeInactive: boolean = false,
  ) {
    return this.tablesService.getHallsByRestaurant(restaurantId, includeInactive);
  }

  @Get('halls/:id')
  @ApiOperation({ summary: 'Получить зал по ID' })
  @ApiResponse({ status: 404, description: 'Зал не найден' })
  getHallById(@Param('id') id: string) {
    return this.tablesService.getHallById(id);
  }

  @Patch('halls/:id')
  @ApiOperation({ summary: 'Обновить зал' })
  @ApiResponse({ status: 404, description: 'Зал не найден' })
  updateHall(@Param('id') id: string, @Body() updateHallDto: UpdateHallDto) {
    return this.tablesService.updateHall(id, updateHallDto);
  }

  @Delete('halls/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить зал' })
  @ApiResponse({ status: 404, description: 'Зал не найден' })
  @ApiResponse({ status: 400, description: 'В зале есть столы' })
  deleteHall(@Param('id') id: string) {
    return this.tablesService.deleteHall(id);
  }

  // ========== СТОЛЫ ==========

  @Post('tables')
  @ApiOperation({ summary: 'Создать новый стол' })
  @ApiResponse({ status: 201, description: 'Стол успешно создан' })
  @ApiResponse({ status: 400, description: 'Неверные данные' })
  @ApiResponse({ status: 404, description: 'Зал не найден' })
  createTable(@Body() createTableDto: CreateTableDto) {
    return this.tablesService.createTable(createTableDto);
  }

  @Get('tables')
  @ApiOperation({ summary: 'Получить все столы с фильтрацией' })
  getTables(@Query() query: TableQueryDto) {
    return this.tablesService.getTables(query);
  }

  @Get('tables/available')
  @ApiOperation({ summary: 'Получить доступные столы' })
  @ApiQuery({ name: 'hallId', required: true })
  @ApiQuery({ name: 'requiredSeats', required: true, type: Number })
  @ApiQuery({ name: 'excludeTableId', required: false })
  getAvailableTables(
    @Query('hallId') hallId: string,
    @Query('requiredSeats') requiredSeats: number,
    @Query('excludeTableId') excludeTableId?: string,
  ) {
    return this.tablesService.getAvailableTables(hallId, parseInt(requiredSeats.toString()), excludeTableId);
  }

  @Get('tables/:id')
  @ApiOperation({ summary: 'Получить стол по ID' })
  @ApiResponse({ status: 404, description: 'Стол не найден' })
  getTableById(@Param('id') id: string) {
    return this.tablesService.getTableById(id);
  }

  @Patch('tables/:id')
  @ApiOperation({ summary: 'Обновить стол' })
  @ApiResponse({ status: 404, description: 'Стол не найден' })
  updateTable(@Param('id') id: string, @Body() updateTableDto: UpdateTableDto) {
    return this.tablesService.updateTable(id, updateTableDto);
  }

  @Patch('tables/:id/status')
  @ApiOperation({ summary: 'Изменить статус стола' })
  @ApiResponse({ status: 404, description: 'Стол не найден' })
  updateTableStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('orderId') orderId?: string,
  ) {
    return this.tablesService.updateTableStatus(id, status as any, orderId);
  }

  @Delete('tables/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить стол' })
  @ApiResponse({ status: 404, description: 'Стол не найден' })
  @ApiResponse({ status: 400, description: 'Стол занят или является частью объединения' })
  deleteTable(@Param('id') id: string) {
    return this.tablesService.deleteTable(id);
  }

  // ========== ОБЪЕДИНЕНИЕ СТОЛОВ ==========

  @Post('tables/combine')
  @ApiOperation({ summary: 'Объединить столы' })
  @ApiResponse({ status: 201, description: 'Столы успешно объединены' })
  @ApiResponse({ status: 400, description: 'Нельзя объединить занятые столы' })
  combineTables(@Body() combineTablesDto: CombineTablesDto) {
    return this.tablesService.combineTables(combineTablesDto);
  }

  @Post('tables/:id/separate')
  @ApiOperation({ summary: 'Разъединить объединенный стол' })
  @ApiResponse({ status: 200, description: 'Стол успешно разъединен' })
  @ApiResponse({ status: 404, description: 'Стол не найден' })
  @ApiResponse({ status: 400, description: 'Нельзя разъединить занятый стол' })
  separateTables(@Param('id') id: string) {
    return this.tablesService.separateTables(id);
  }

  // ========== ТЕГИ ==========

  @Post('tags')
  @ApiOperation({ summary: 'Создать новый тег для столов' })
  @ApiResponse({ status: 201, description: 'Тег успешно создан' })
  @ApiResponse({ status: 400, description: 'Неверные данные' })
  @ApiResponse({ status: 404, description: 'Ресторан не найден' })
  createTableTag(@Body() createTableTagDto: CreateTableTagDto) {
    return this.tablesService.createTableTag(createTableTagDto);
  }

  @Get('tags/restaurant/:restaurantId')
  @ApiOperation({ summary: 'Получить все теги ресторана' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  getTableTagsByRestaurant(
    @Param('restaurantId') restaurantId: string,
    @Query('includeInactive') includeInactive: boolean = false,
  ) {
    return this.tablesService.getTableTagsByRestaurant(restaurantId, includeInactive);
  }

  @Get('tags/:id')
  @ApiOperation({ summary: 'Получить тег по ID' })
  @ApiResponse({ status: 404, description: 'Тег не найден' })
  getTableTagById(@Param('id') id: string) {
    return this.tablesService.getTableTagById(id);
  }

  @Patch('tags/:id')
  @ApiOperation({ summary: 'Обновить тег' })
  @ApiResponse({ status: 404, description: 'Тег не найден' })
  updateTableTag(@Param('id') id: string, @Body() updateTableTagDto: UpdateTableTagDto) {
    return this.tablesService.updateTableTag(id, updateTableTagDto);
  }

  @Delete('tags/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить тег' })
  @ApiResponse({ status: 404, description: 'Тег не найден' })
  @ApiResponse({ status: 400, description: 'Тег используется столами' })
  deleteTableTag(@Param('id') id: string) {
    return this.tablesService.deleteTableTag(id);
  }

  // ========== СТАТИСТИКА И ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

  @Get('statistics/restaurant/:restaurantId')
  @ApiOperation({ summary: 'Получить статистику по столам ресторана' })
  getTableStatistics(@Param('restaurantId') restaurantId: string) {
    return this.tablesService.getTableStatistics(restaurantId);
  }

  @Post('tables/:tableId/assign-order')
  @ApiOperation({ summary: 'Привязать заказ к столу' })
  @ApiResponse({ status: 200, description: 'Заказ успешно привязан' })
  @ApiResponse({ status: 404, description: 'Стол не найден' })
  @ApiResponse({ status: 400, description: 'Стол занят или забронирован' })
  assignOrderToTable(
    @Param('tableId') tableId: string,
    @Body('orderId') orderId: string,
  ) {
    return null;
  }

  @Post('tables/:tableId/release-order')
  @ApiOperation({ summary: 'Освободить стол от заказа' })
  @ApiResponse({ status: 200, description: 'Стол успешно освобожден' })
  @ApiResponse({ status: 404, description: 'Стол не найден' })
  releaseTableFromOrder(@Param('tableId') tableId: string) {
    return null;
  }

  @Get('halls/:id/layout')
  @ApiOperation({ summary: 'Получить полную планировку зала' })
  getHallLayout(@Param('id') id: string) {
    return this.tablesService.getHallLayout(id);
  }

  @Post('halls/:id/layout')
  @ApiOperation({ summary: 'Сохранить планировку зала' })
  saveHallLayout(
    @Param('id') id: string,
    @Body() layout: {
      walls: any[];
      doors: any[];
      windows: any[];
      guides: any[];
    }
  ) {
    return this.tablesService.saveHallLayout(id, layout);
  }
}