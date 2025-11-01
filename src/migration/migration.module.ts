import { Module } from '@nestjs/common';
import { MigrationService } from './migration.service';
import { MigrationController } from './migration.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [MigrationService, PrismaService],
  controllers: [MigrationController],
  exports: [MigrationService]
})
export class MigrationModule {}