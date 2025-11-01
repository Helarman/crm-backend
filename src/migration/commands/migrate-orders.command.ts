// commands/migrate-orders.command.ts
import { Command, CommandRunner } from 'nest-commander';
import { MigrationService } from 'src/migration/migration.service';

@Command({ 
  name: 'migrate-orders', 
  description: 'Миграция порядков категорий и продуктов' 
})
export class MigrateOrdersCommand extends CommandRunner {
  constructor(private readonly migrationService: MigrationService) {
    super();
  }

  async run(): Promise<void> {
    console.log('🚀 Starting order migration...');
    
    try {
      // Проверяем текущий статус
      const status = await this.migrationService.checkOrderStatus();
      console.log('📊 Current status:', JSON.stringify(status, null, 2));

      // Выполняем миграциюs
      const result = await this.migrationService.migrateAllOrders();
      console.log('✅ Migration completed:', JSON.stringify(result, null, 2));

      // Проверяем результат
      const finalStatus = await this.migrationService.checkOrderStatus();
      console.log('📊 Final status:', JSON.stringify(finalStatus, null, 2));

    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  }
}