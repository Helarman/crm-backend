import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Put, 
  Delete,
  Patch 
} from '@nestjs/common';
import { WorkshopService } from './workshop.service';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { WorkshopResponseDto } from './dto/workshop-response.dto';
import { AssignUsersDto } from './dto/assign-users.dto';
import { AssignRestaurantsDto } from './dto/assign-users.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

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

  @Post(':id/restaurants')
  @ApiOperation({ summary: 'Добавить рестораны в цех' })
  @ApiResponse({ status: 200 })
  async addRestaurants(
    @Param('id') workshopId: string,
    @Body() dto: AssignRestaurantsDto,
  ): Promise<void> {
    return this.workshopService.addRestaurants(workshopId, dto.restaurantIds);
  }

  @Delete(':id/restaurants')
  @ApiOperation({ summary: 'Удалить рестораны из цеха' })
  @ApiResponse({ status: 204 })
  async removeRestaurants(
    @Param('id') workshopId: string,
    @Body() dto: AssignRestaurantsDto,
  ): Promise<void> {
    return this.workshopService.removeRestaurants(workshopId, dto.restaurantIds);
  }

  @Get('restaurant/:restaurantId')
  @ApiOperation({ 
    summary: 'Получить цехи по ресторану',
    description: 'Возвращает список всех цехов, привязанных к указанному ресторану'
  })
  @ApiParam({
    name: 'restaurantId',
    type: String,
    description: 'ID ресторана',
    example: 'cln8z9p3a000008l49w9z5q1e'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Список цехов ресторана',
    type: [WorkshopResponseDto]
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Ресторан не найден' 
  })
  async getWorkshopsByRestaurant(
    @Param('restaurantId') restaurantId: string,
  ): Promise<WorkshopResponseDto[]> {
    return this.workshopService.findByRestaurantId(restaurantId);
  }

  // Новые эндпоинты для работы с сетями
  @Get('network/:networkId')
  @ApiOperation({ 
    summary: 'Получить цехи по сети',
    description: 'Возвращает список всех цехов, принадлежащих указанной сети'
  })
  @ApiParam({
    name: 'networkId',
    type: String,
    description: 'ID сети',
    example: 'cln8z9p3a000008l49w9z5q1e'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Список цехов сети',
    type: [WorkshopResponseDto]
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Сеть не найдена' 
  })
  async getWorkshopsByNetwork(
    @Param('networkId') networkId: string,
  ): Promise<WorkshopResponseDto[]> {
    return this.workshopService.findByNetworkId(networkId);
  }

  @Patch(':id/network')
  @ApiOperation({ 
    summary: 'Обновить сеть цеха',
    description: 'Привязывает цех к сети или удаляет привязку'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID цеха'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Обновленный цех',
    type: WorkshopResponseDto
  })
  async updateNetwork(
    @Param('id') workshopId: string,
    @Body('networkId') networkId: string | null,
  ): Promise<WorkshopResponseDto> {
    return this.workshopService.updateNetwork(workshopId, networkId);
  }
}