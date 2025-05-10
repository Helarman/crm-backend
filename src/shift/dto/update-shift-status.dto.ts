import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { EnumShiftStatus } from '@prisma/client';

export class UpdateShiftStatusDto {
    @ApiProperty({ enum: EnumShiftStatus, example: EnumShiftStatus.PLANNED })
    @IsEnum(EnumShiftStatus)
    status: EnumShiftStatus;
  }