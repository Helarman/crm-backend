import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody, 
  ApiParam, 
  ApiBearerAuth
} from '@nestjs/swagger';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantService } from './tenant.service';

@ApiTags('Тенанты')
@ApiBearerAuth()
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  @ApiOperation({ summary: 'Получить все тенанты' })
  @ApiResponse({ status: 200, description: 'Список тенантов' })
  async getAll() {
    return this.tenantService.getAll();
  }

  @Post()
  @UsePipes(new ValidationPipe())
  @ApiOperation({ summary: 'Создать новый тенант' })
  @ApiBody({ type: CreateTenantDto })
  @ApiResponse({ status: 201, description: 'Тенант создан' })
  async create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  @Put(':id')
  @UsePipes(new ValidationPipe())
  @ApiOperation({ summary: 'Обновить тенант' })
  @ApiParam({ name: 'id', description: 'ID тенанта' })
  @ApiBody({ type: UpdateTenantDto })
  @ApiResponse({ status: 200, description: 'Тенант обновлен' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto
  ) {
    return this.tenantService.update(id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить тенант по ID' })
  @ApiParam({ name: 'id', description: 'ID тенанта' })
  @ApiResponse({ status: 200, description: 'Тенант найден' })
  async getById(@Param('id') id: string) {
    return this.tenantService.getById(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить тенант' })
  @ApiParam({ name: 'id', description: 'ID тенанта' })
  @ApiResponse({ status: 200, description: 'Тенант удален' })
  async delete(@Param('id') id: string) {
    return this.tenantService.delete(id);
  }
}