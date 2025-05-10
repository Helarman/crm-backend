import { Module } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { ShiftController } from './shift.controller'
import { ShiftService } from './shift.service'

@Module({
  controllers: [ShiftController],
  providers: [ShiftService, PrismaService],
})
export class ShiftModule {}