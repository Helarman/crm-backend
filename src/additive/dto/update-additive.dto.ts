import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { CreateAdditiveDto } from './create-additive.dto';

export class UpdateAdditiveDto extends PartialType(CreateAdditiveDto) {}