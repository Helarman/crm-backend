import { INestApplication, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL + (process.env.NODE_ENV === 'production' 
               ? '?connection_limit=10&pool_timeout=10' 
               : '?connection_limit=20&pool_timeout=10')
        }
      },
      log: ['warn', 'error']
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    // Исправленная версия с правильной типизацией
    process.on('beforeExit', async () => {
      await app.close();
    });
    
    // Альтернативный вариант для Prisma
    this.$on('beforeExit' as never, async () => {
      await app.close();
    });
  }
}