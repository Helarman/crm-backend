import { Module } from '@nestjs/common';
import { AdditiveService } from './additive.service';
import { AdditiveController } from './additive.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [AdditiveController],
  providers: [AdditiveService, PrismaService],
  exports: [AdditiveService],
})
export class AdditiveModule {}