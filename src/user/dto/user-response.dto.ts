import { ApiProperty } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { EnumUserRoles } from '@prisma/client';

export class UserResponseDto implements Omit<User, 'password'> {
  @ApiProperty({
    example: 'clnjt4pkg000008l49ga0b5j3',
    description: 'Уникальный идентификатор пользователя',
  })
  id: string;

  @ApiProperty({
    example: '2023-10-15T12:00:00.000Z',
    description: 'Дата создания пользователя',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-10-16T09:30:00.000Z',
    description: 'Дата последнего обновления пользователя',
  })
  updatedAt: Date;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email пользователя',
  })
  email: string;

  @ApiProperty({
    example: false,
    description: 'Флаг блокировки пользователя',
    default: false,
  })

  isBlocked: boolean;
    @ApiProperty({
    example: '+79001234567',
    description: 'Номер телефона пользователя',
    required: false,
    nullable: true,
  })
  phone: string | null;

  @ApiProperty({
    example: 'Иван Иванов',
    description: 'Имя пользователя',
    default: 'Не указано',
  })
  name: string;

  @ApiProperty({
    example: '/uploads/no-user-image.png',
    description: 'Аватар пользователя',
    default: '/uploads/no-user-image.png',
  })
  picture: string;

  @ApiProperty({
    enum: EnumUserRoles,
    example: EnumUserRoles.NONE,
    description: 'Роль пользователя в системе',
    default: EnumUserRoles.NONE,
  })
  role: EnumUserRoles;

  @ApiProperty({
    description: 'Рестораны, связанные с пользователем',
    type: () => Array<object>,
  })
  restaurant?: object[];

  @ApiProperty({
    description: 'Смены пользователя',
    type: () => Array<object>,
  })
  shifts?: object[];
}