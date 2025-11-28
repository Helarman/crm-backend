import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class AssignCourierDto {
  @ApiProperty({ description: 'ID курьера' })
  @IsString()
  courierId: string;
}