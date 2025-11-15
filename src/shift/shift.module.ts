import { Module } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { ShiftController } from './shift.controller'
import { ShiftService } from './shift.service'
import { ShiftCronService } from './shift-cron.service'

@Module({
  controllers: [ShiftController],
  providers: [ShiftService, ShiftCronService, PrismaService],
})
export class ShiftModule {}