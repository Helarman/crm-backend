import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class ToggleBlockDto {
  @ApiProperty({
    description: 'Статус блокировки пользователя',
    example: true,
    required: true
  })
  @IsBoolean()
  isBlocked: boolean;
}