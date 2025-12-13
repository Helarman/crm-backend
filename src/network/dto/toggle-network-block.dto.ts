import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ToggleNetworkBlockDto {
  @ApiProperty({ description: 'Заблокировать/разблокировать сеть' })
  @IsBoolean()
  isBlocked: boolean;

  @ApiProperty({ description: 'Причина блокировки/разблокировки', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}