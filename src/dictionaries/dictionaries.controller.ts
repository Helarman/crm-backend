import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DictionariesService } from './dictionaries.service';
import { CreateDictionaryDto } from './dto/create-dictionary.dto';
import { UpdateDictionaryDto } from './dto/update-dictionary.dto';
import { DictionaryResponseDto } from './dto/dictionary-response.dto';

@ApiTags('Справочники склада')
@Controller('dictionaries')
export class DictionariesController {
  constructor(private readonly dictionariesService: DictionariesService) {}

  @Post('write-off-reasons')
  @ApiOperation({ summary: 'Создать причину списания' })
  @ApiResponse({ status: 201, type: DictionaryResponseDto })
  createWriteOffReason(@Body() createDto: CreateDictionaryDto) {
    return this.dictionariesService.createWriteOffReason(createDto);
  }

  @Get('write-off-reasons')
  @ApiOperation({ summary: 'Получить все причины списания' })
  @ApiResponse({ status: 200, type: [DictionaryResponseDto] })
  findAllWriteOffReasons() {
    return this.dictionariesService.findAllWriteOffReasons();
  }

  @Get('write-off-reasons/:id')
  @ApiOperation({ summary: 'Получить причину списания по ID' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  findWriteOffReasonById(@Param('id') id: string) {
    return this.dictionariesService.findWriteOffReasonById(+id);
  }

  @Put('write-off-reasons/:id')
  @ApiOperation({ summary: 'Обновить причину списания' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  updateWriteOffReason(
    @Param('id') id: string,
    @Body() updateDto: UpdateDictionaryDto,
  ) {
    return this.dictionariesService.updateWriteOffReason(+id, updateDto);
  }

  @Delete('write-off-reasons/:id')
  @ApiOperation({ summary: 'Удалить причину списания' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  removeWriteOffReason(@Param('id') id: string) {
    return this.dictionariesService.removeWriteOffReason(+id);
  }

  @Post('receipt-reasons')
  @ApiOperation({ summary: 'Создать причину прихода' })
  @ApiResponse({ status: 201, type: DictionaryResponseDto })
  createReceiptReason(@Body() createDto: CreateDictionaryDto) {
    return this.dictionariesService.createReceiptReason(createDto);
  }

  @Get('receipt-reasons')
  @ApiOperation({ summary: 'Получить все причины приходов' })
  @ApiResponse({ status: 200, type: [DictionaryResponseDto] })
  findAllReceiptReasons() {
    return this.dictionariesService.findAllReceiptReasons();
  }

  @Get('receipt-reasons/:id')
  @ApiOperation({ summary: 'Получить причину прихода по ID' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  findReceiptReasonById(@Param('id') id: string) {
    return this.dictionariesService.findReceiptReasonById(+id);
  }

  @Put('receipt-reasons/:id')
  @ApiOperation({ summary: 'Обновить причину прихода' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  updateReceiptReason(
    @Param('id') id: string,
    @Body() updateDto: UpdateDictionaryDto,
  ) {
    return this.dictionariesService.updateReceiptReason(+id, updateDto);
  }

  @Delete('receipt-reasons/:id')
  @ApiOperation({ summary: 'Удалить причину прихода' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  removeReceiptReason(@Param('id') id: string) {
    return this.dictionariesService.removeReceiptReason(+id);
  }

  @Post('movement-reasons')
  @ApiOperation({ summary: 'Создать причину перемещения' })
  @ApiResponse({ status: 201, type: DictionaryResponseDto })
  createMovementReason(@Body() createDto: CreateDictionaryDto) {
    return this.dictionariesService.createMovementReason(createDto);
  }

  @Get('movement-reasons')
  @ApiOperation({ summary: 'Получить все причины перемещений' })
  @ApiResponse({ status: 200, type: [DictionaryResponseDto] })
  findAllMovementReasons() {
    return this.dictionariesService.findAllMovementReasons();
  }

  @Get('movement-reasons/:id')
  @ApiOperation({ summary: 'Получить причину перемещения по ID' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  findMovementReasonById(@Param('id') id: string) {
    return this.dictionariesService.findMovementReasonById(+id);
  }

  @Put('movement-reasons/:id')
  @ApiOperation({ summary: 'Обновить причину перемещения' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  updateMovementReason(
    @Param('id') id: string,
    @Body() updateDto: UpdateDictionaryDto,
  ) {
    return this.dictionariesService.updateMovementReason(+id, updateDto);
  }

  @Delete('movement-reasons/:id')
  @ApiOperation({ summary: 'Удалить причину перемещения' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  removeMovementReason(@Param('id') id: string) {
    return this.dictionariesService.removeMovementReason(+id);
  }
}