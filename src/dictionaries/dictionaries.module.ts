import { Module } from '@nestjs/common';
import { DictionariesService } from './dictionaries.service';
import { DictionariesController } from './dictionaries.controller';
import { PrismaService } from 'src/prisma.service';


@Module({
  controllers: [DictionariesController],
  providers: [DictionariesService, PrismaService],
  exports: [DictionariesService],
})
export class DictionariesModule {}