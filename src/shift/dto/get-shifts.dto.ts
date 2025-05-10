import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetShiftsDto {
    @ApiPropertyOptional({ description: 'ID ресторана для фильтрации' })
    @IsOptional()
    @IsString()
    restaurantId?: string;

    @ApiPropertyOptional({ description: 'Статус смены для фильтрации' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ description: 'Номер страницы', default: 1 })
    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Лимит на страницу', default: 10 })
    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsNumber()
    @Min(1)
    limit?: number = 10;
}