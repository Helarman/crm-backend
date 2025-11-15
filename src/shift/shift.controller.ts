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
  import { CreateShiftExpenseDto, UpdateShiftExpenseDto } from './dto/shift-expense.dto';
  import { CreateShiftIncomeDto, UpdateShiftIncomeDto } from './dto/shift-income.dto';
  import { ShiftCronService } from './shift-cron.service';
  
  @ApiTags('Смены')
  @ApiBearerAuth()
  @Controller('shifts')
  export class ShiftController {
    constructor(
      private readonly shiftService: ShiftService,
      private readonly shiftCronService: ShiftCronService,
    ) {}
  
    
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

    @Post(':id/expenses')
  @HttpCode(201)
  @ApiOperation({ summary: 'Добавить расход к смене' })
  @ApiParam({ name: 'id', description: 'ID смены' })
  @ApiBody({ type: CreateShiftExpenseDto })
  @ApiResponse({ status: 201, description: 'Расход добавлен' })
  @ApiResponse({ status: 404, description: 'Смена не найдена' })
  async addExpense(
    @Param('id') shiftId: string,
    @Body() dto: CreateShiftExpenseDto,
  ) {
    return this.shiftService.addExpenseToShift(shiftId, dto);
  }

  @Get(':id/expenses')
  @ApiOperation({ summary: 'Получить расходы смены' })
  @ApiParam({ name: 'id', description: 'ID смены' })
  @ApiResponse({ status: 200, description: 'Список расходов' })
  @ApiResponse({ status: 404, description: 'Смена не найдена' })
  async getExpenses(@Param('id') shiftId: string) {
    return this.shiftService.getShiftExpenses(shiftId);
  }

  @Delete('expenses/:expenseId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Удалить расход' })
  @ApiParam({ name: 'expenseId', description: 'ID расхода' })
  @ApiResponse({ status: 200, description: 'Расход удален' })
  @ApiResponse({ status: 404, description: 'Расход не найден' })
  async removeExpense(@Param('expenseId') expenseId: string) {
    return this.shiftService.removeExpense(expenseId);
  }

  @Put('expenses/:expenseId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Обновить расход' })
  @ApiParam({ name: 'expenseId', description: 'ID расхода' })
  @ApiBody({ type: UpdateShiftExpenseDto })
  @ApiResponse({ status: 200, description: 'Расход обновлен' })
  @ApiResponse({ status: 404, description: 'Расход не найден' })
  async updateExpense(
    @Param('expenseId') expenseId: string,
    @Body() dto: UpdateShiftExpenseDto,
  ) {
    return this.shiftService.updateExpense(expenseId, dto);
  }

  @Post(':id/incomes')
  @HttpCode(201)
  @ApiOperation({ summary: 'Добавить доход к смене' })
  @ApiParam({ name: 'id', description: 'ID смены' })
  @ApiBody({ type: CreateShiftIncomeDto })
  @ApiResponse({ status: 201, description: 'Доход добавлен' })
  @ApiResponse({ status: 404, description: 'Смена не найдена' })
  async addIncome(
    @Param('id') shiftId: string,
    @Body() dto: CreateShiftIncomeDto,
  ) {
    return this.shiftService.addIncomeToShift(shiftId, dto);
  }

  @Get(':id/incomes')
  @ApiOperation({ summary: 'Получить доходы смены' })
  @ApiParam({ name: 'id', description: 'ID смены' })
  @ApiResponse({ status: 200, description: 'Список доходов' })
  @ApiResponse({ status: 404, description: 'Смена не найдена' })
  async getIncomes(@Param('id') shiftId: string) {
    return this.shiftService.getShiftIncomes(shiftId);
  }

  @Delete('incomes/:incomeId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Удалить доход' })
  @ApiParam({ name: 'incomeId', description: 'ID дохода' })
  @ApiResponse({ status: 200, description: 'Доход удален' })
  @ApiResponse({ status: 404, description: 'Доход не найден' })
  async removeIncome(@Param('incomeId') incomeId: string) {
    return this.shiftService.removeIncome(incomeId);
  }

  @Put('incomes/:incomeId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Обновить доход' })
  @ApiParam({ name: 'incomeId', description: 'ID дохода' })
  @ApiBody({ type: UpdateShiftIncomeDto })
  @ApiResponse({ status: 200, description: 'Доход обновлен' })
  @ApiResponse({ status: 404, description: 'Доход не найден' })
  async updateIncome(
    @Param('incomeId') incomeId: string,
    @Body() dto: UpdateShiftIncomeDto,
  ) {
    return this.shiftService.updateIncome(incomeId, dto);
  }

   @Get(':id/auto-close-time')
  @ApiOperation({ summary: 'Получить время автоматического закрытия смены' })
  @ApiParam({ name: 'id', description: 'ID смены' })
  @ApiResponse({ status: 200, description: 'Время автоматического закрытия' })
  @ApiResponse({ status: 404, description: 'Смена не найдена' })
  async getAutoCloseTime(@Param('id') shiftId: string) {
    return this.shiftService.getShiftAutoCloseTime(shiftId);
  }

  @Post('cron/manual-check')
  @HttpCode(200)
  @ApiOperation({ summary: 'Принудительная проверка закрытия смен (для тестирования)' })
  @ApiResponse({ status: 200, description: 'Проверка выполнена' })
  async manualCronCheck() {
    await this.shiftCronService.manuallyCheckShiftClosure();
    return { message: 'Проверка автоматического закрытия смен выполнена' };
  }
  @Get('cron/debug')
  @ApiOperation({ summary: 'Отладочная информация по автоматическому закрытию смен' })
  async getCronDebugInfo() {
    return this.shiftCronService.debugShiftClosure();
}
 }