// migration.controller.ts
import { Controller, Post, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MigrationService } from './migration.service';

@ApiTags('Миграция данных')
@Controller('migration')
export class MigrationController {
  private readonly logger = new Logger(MigrationController.name);

  constructor(private readonly migrationService: MigrationService) {}

  @Post('orders')
  @ApiOperation({ summary: 'Мигрировать все порядки' })
  @ApiResponse({ status: 200, description: 'Миграция выполнена успешно' })
  async migrateOrders() {
    this.logger.log('Starting order migration via API...');
    return this.migrationService.migrateAllOrders();
  }

  @Get('status')
  @ApiOperation({ summary: 'Проверить статус порядков' })
  @ApiResponse({ status: 200, description: 'Статус получен' })
  async getOrderStatus() {
    return this.migrationService.checkOrderStatus();
  }

  @Post('reset')
  @ApiOperation({ summary: 'Сбросить все порядки к 0 (только для тестирования)' })
  @ApiResponse({ status: 200, description: 'Порядки сброшены' })
  async resetOrders() {
    this.logger.warn('Resetting all orders via API...');
    return this.migrationService.resetAllOrders();
  }

}