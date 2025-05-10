import { ApiProperty } from '@nestjs/swagger';
import { $Enums } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateRoleDto {
  @ApiProperty({ enum: $Enums.EnumUserRoles })
  @IsEnum($Enums.EnumUserRoles)
  role: $Enums.EnumUserRoles;
}