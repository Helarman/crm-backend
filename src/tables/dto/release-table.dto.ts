import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class ReleaseTableDto {
  @ApiProperty({ 
    description: 'Причина освобождения стола',
    required: false 
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ 
    description: 'Автоматически обновить статус на "СВОБОДЕН"',
    required: false,
    default: true 
  })
  autoSetAvailable?: boolean = true;
}