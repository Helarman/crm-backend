import { Module } from '@nestjs/common';
import { MarkupController } from './markup.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [MarkupController],
  providers: [PrismaService]
})
export class MarkupModule {}