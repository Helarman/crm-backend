import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DictionariesService } from './dictionaries.service';
import { CreateDictionaryDto, CopyDictionaryDto } from './dto/create-dictionary.dto';
import { UpdateDictionaryDto } from './dto/update-dictionary.dto';
import { DictionaryResponseDto } from './dto/dictionary-response.dto';

@ApiTags('Справочники склада')
@Controller('dictionaries')
export class DictionariesController {
  constructor(private readonly dictionariesService: DictionariesService) {}

  // Причины списания
  @Post('write-off-reasons')
  @ApiOperation({ summary: 'Создать причину списания' })
  @ApiResponse({ status: 201, type: DictionaryResponseDto })
  createWriteOffReason(@Body() createDto: CreateDictionaryDto) {
    return this.dictionariesService.createWriteOffReason(createDto);
  }

  @Get('write-off-reasons')
  @ApiOperation({ summary: 'Получить все причины списания' })
  @ApiQuery({ name: 'restaurantId', required: false, type: Number })
  @ApiResponse({ status: 200, type: [DictionaryResponseDto] })
  findAllWriteOffReasons(@Query('restaurantId') restaurantId?: string) {
    return this.dictionariesService.findAllWriteOffReasons(
      restaurantId ? restaurantId : undefined,
    );
  }

  @Get('write-off-reasons/:id')
  @ApiOperation({ summary: 'Получить причину списания по ID' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  findWriteOffReasonById(@Param('id') id: string) {
    return this.dictionariesService.findWriteOffReasonById(id);
  }

  @Put('write-off-reasons/:id')
  @ApiOperation({ summary: 'Обновить причину списания' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  updateWriteOffReason(
    @Param('id') id: string,
    @Body() updateDto: UpdateDictionaryDto,
  ) {
    return this.dictionariesService.updateWriteOffReason(id, updateDto);
  }

  @Delete('write-off-reasons/:id')
  @ApiOperation({ summary: 'Удалить причину списания' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  removeWriteOffReason(@Param('id') id: string) {
    return this.dictionariesService.removeWriteOffReason(id);
  }

  // Причины прихода
  @Post('receipt-reasons')
  @ApiOperation({ summary: 'Создать причину прихода' })
  @ApiResponse({ status: 201, type: DictionaryResponseDto })
  createReceiptReason(@Body() createDto: CreateDictionaryDto) {
    return this.dictionariesService.createReceiptReason(createDto);
  }

  @Get('receipt-reasons')
  @ApiOperation({ summary: 'Получить все причины приходов' })
  @ApiQuery({ name: 'restaurantId', required: false, type: Number })
  @ApiResponse({ status: 200, type: [DictionaryResponseDto] })
  findAllReceiptReasons(@Query('restaurantId') restaurantId?: string) {
    return this.dictionariesService.findAllReceiptReasons(
      restaurantId ? restaurantId : undefined,
    );
  }

  @Get('receipt-reasons/:id')
  @ApiOperation({ summary: 'Получить причину прихода по ID' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  findReceiptReasonById(@Param('id') id: string) {
    return this.dictionariesService.findReceiptReasonById(id);
  }

  @Put('receipt-reasons/:id')
  @ApiOperation({ summary: 'Обновить причину прихода' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  updateReceiptReason(
    @Param('id') id: string,
    @Body() updateDto: UpdateDictionaryDto,
  ) {
    return this.dictionariesService.updateReceiptReason(id, updateDto);
  }

  @Delete('receipt-reasons/:id')
  @ApiOperation({ summary: 'Удалить причину прихода' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  removeReceiptReason(@Param('id') id: string) {
    return this.dictionariesService.removeReceiptReason(id);
  }

  // Причины перемещения
  @Post('movement-reasons')
  @ApiOperation({ summary: 'Создать причину перемещения' })
  @ApiResponse({ status: 201, type: DictionaryResponseDto })
  createMovementReason(@Body() createDto: CreateDictionaryDto) {
    return this.dictionariesService.createMovementReason(createDto);
  }

  @Get('movement-reasons')
  @ApiOperation({ summary: 'Получить все причины перемещений' })
  @ApiQuery({ name: 'restaurantId', required: false, type: Number })
  @ApiResponse({ status: 200, type: [DictionaryResponseDto] })
  findAllMovementReasons(@Query('restaurantId') restaurantId?: string) {
    return this.dictionariesService.findAllMovementReasons(
      restaurantId ? restaurantId : undefined,
    );
  }

  @Get('movement-reasons/:id')
  @ApiOperation({ summary: 'Получить причину перемещения по ID' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  findMovementReasonById(@Param('id') id: string) {
    return this.dictionariesService.findMovementReasonById(id);
  }

  @Put('movement-reasons/:id')
  @ApiOperation({ summary: 'Обновить причину перемещения' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  updateMovementReason(
    @Param('id') id: string,
    @Body() updateDto: UpdateDictionaryDto,
  ) {
    return this.dictionariesService.updateMovementReason(id, updateDto);
  }

  @Delete('movement-reasons/:id')
  @ApiOperation({ summary: 'Удалить причину перемещения' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  removeMovementReason(@Param('id') id: string) {
    return this.dictionariesService.removeMovementReason(id);
  }

  // Причины доходов
  @Post('income-reasons')
  @ApiOperation({ summary: 'Создать причину дохода' })
  @ApiResponse({ status: 201, type: DictionaryResponseDto })
  createIncomeReason(@Body() createDto: CreateDictionaryDto) {
    return this.dictionariesService.createIncomeReason(createDto);
  }

  @Get('income-reasons')
  @ApiOperation({ summary: 'Получить все причины доходов' })
  @ApiQuery({ name: 'restaurantId', required: false, type: Number })
  @ApiResponse({ status: 200, type: [DictionaryResponseDto] })
  findAllIncomeReasons(@Query('restaurantId') restaurantId?: string) {
    return this.dictionariesService.findAllIncomeReasons(
      restaurantId ? restaurantId : undefined,
    );
  }

  @Get('income-reasons/:id')
  @ApiOperation({ summary: 'Получить причину дохода по ID' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  findIncomeReasonById(@Param('id') id: string) {
    return this.dictionariesService.findIncomeReasonById(id);
  }

  @Put('income-reasons/:id')
  @ApiOperation({ summary: 'Обновить причину дохода' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  updateIncomeReason(
    @Param('id') id: string,
    @Body() updateDto: UpdateDictionaryDto,
  ) {
    return this.dictionariesService.updateIncomeReason(id, updateDto);
  }

  @Delete('income-reasons/:id')
  @ApiOperation({ summary: 'Удалить причину дохода' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  removeIncomeReason(@Param('id') id: string) {
    return this.dictionariesService.removeIncomeReason(id);
  }

  // Причины расходов
  @Post('expense-reasons')
  @ApiOperation({ summary: 'Создать причину расхода' })
  @ApiResponse({ status: 201, type: DictionaryResponseDto })
  createExpenseReason(@Body() createDto: CreateDictionaryDto) {
    return this.dictionariesService.createExpenseReason(createDto);
  }

  @Get('expense-reasons')
  @ApiOperation({ summary: 'Получить все причины расходов' })
  @ApiQuery({ name: 'restaurantId', required: false, type: Number })
  @ApiResponse({ status: 200, type: [DictionaryResponseDto] })
  findAllExpenseReasons(@Query('restaurantId') restaurantId?: string) {
    return this.dictionariesService.findAllExpenseReasons(
      restaurantId ? restaurantId : undefined,
    );
  }

  @Get('expense-reasons/:id')
  @ApiOperation({ summary: 'Получить причину расхода по ID' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  findExpenseReasonById(@Param('id') id: string) {
    return this.dictionariesService.findExpenseReasonById(id);
  }

  @Put('expense-reasons/:id')
  @ApiOperation({ summary: 'Обновить причину расхода' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  updateExpenseReason(
    @Param('id') id: string,
    @Body() updateDto: UpdateDictionaryDto,
  ) {
    return this.dictionariesService.updateExpenseReason(id, updateDto);
  }

  @Delete('expense-reasons/:id')
  @ApiOperation({ summary: 'Удалить причину расхода' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  removeExpenseReason(@Param('id') id: string) {
    return this.dictionariesService.removeExpenseReason(id);
  }

  // Копирование между ресторанами
  @Post('copy-between-restaurants')
  @ApiOperation({ summary: 'Скопировать справочники из одного ресторана в другой' })
  @ApiResponse({ status: 201 })
  copyReasonsBetweenRestaurants(@Body() copyDto: CopyDictionaryDto) {
    return this.dictionariesService.copyReasonsBetweenRestaurants(copyDto);
  }
}