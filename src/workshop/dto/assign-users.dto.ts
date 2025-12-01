


import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty } from 'class-validator';
export class AssignUsersDto {
  userIds: string[];
}

export class AssignRestaurantsDto {
  @ApiProperty({ 
    example: ['cln8z9p3a000008l49w9z5q1e', 'cln8z9p3b000108l49w9z5q1e'],
    description: 'Массив ID ресторанов' 
  })
  @IsArray()
  @IsNotEmpty()
  restaurantIds: string[];
}