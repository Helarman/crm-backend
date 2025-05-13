import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { WorkshopService } from './workshop.service';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { WorkshopResponseDto } from './dto/workshop-response.dto';
import { AssignUsersDto } from './dto/assign-users.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Workshops')
@Controller('workshops')
export class WorkshopController {
  constructor(private readonly workshopService: WorkshopService) {}

  @Post()
  @ApiOperation({ summary: 'Создать цех' })
  @ApiResponse({ status: 201, type: WorkshopResponseDto })
  create(@Body() dto: CreateWorkshopDto): Promise<WorkshopResponseDto> {
    return this.workshopService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все цехи' })
  @ApiResponse({ status: 200, type: [WorkshopResponseDto] })
  findAll(): Promise<WorkshopResponseDto[]> {
    return this.workshopService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить цех по ID' })
  @ApiResponse({ status: 200, type: WorkshopResponseDto })
  findOne(@Param('id') id: string): Promise<WorkshopResponseDto> {
    return this.workshopService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить цех' })
  @ApiResponse({ status: 200, type: WorkshopResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkshopDto,
  ): Promise<WorkshopResponseDto> {
    return this.workshopService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить цех' })
  @ApiResponse({ status: 204 })
  delete(@Param('id') id: string): Promise<void> {
    return this.workshopService.delete(id);
  }

  @Post(':id/users')
  @ApiOperation({ summary: 'Добавить пользователей в цех' })
  @ApiResponse({ status: 200 })
  async addUsers(
    @Param('id') workshopId: string,
    @Body() dto: AssignUsersDto,
  ): Promise<void> {
    return this.workshopService.addUsers(workshopId, dto.userIds);
  }

  @Delete(':id/users')
  @ApiOperation({ summary: 'Удалить пользователей из цеха' })
  @ApiResponse({ status: 204 })
  async removeUsers(
    @Param('id') workshopId: string,
    @Body() dto: AssignUsersDto,
  ): Promise<void> {
    return this.workshopService.removeUsers(workshopId, dto.userIds);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'Получить пользователей цеха' })
  @ApiResponse({ status: 200, type: [String] })
  async getUsers(@Param('id') workshopId: string): Promise<string[]> {
    return this.workshopService.getUsers(workshopId);
  }
}