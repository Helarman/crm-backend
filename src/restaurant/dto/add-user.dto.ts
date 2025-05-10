import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddUserDto {
  @ApiProperty({
    type: String,
    example: '507f1f77bcf86cd799439011',
    description: 'Уникальный идентификатор пользователя',
    required: true,
    format: 'ObjectId'
  })
  @IsString({ message: 'ID пользователя должен быть строкой' })
  @IsNotEmpty({ message: 'ID пользователя обязателен' })
  userId: string;
}