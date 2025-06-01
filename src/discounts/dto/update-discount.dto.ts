import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateDiscountDto } from './create-discount.dto';

export class UpdateDiscountDto extends PartialType(CreateDiscountDto) {}