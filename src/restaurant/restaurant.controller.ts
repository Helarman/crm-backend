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
	ApiBearerAuth,
	ApiOkResponse,
	ApiCreatedResponse,
	ApiNotFoundResponse,
	ApiBadRequestResponse,
	ApiUnauthorizedResponse,
	ApiConflictResponse
  } from '@nestjs/swagger';
  import { Auth } from '../auth/decorators/auth.decorator';
  import { AddUserDto } from './dto/add-user.dto';
  import { AddProductDto } from './dto/add-product.dto'; // Добавлен импорт DTO
  import { CreateRestaurantDto } from './dto/create-restaurant.dto';
  import { RestaurantService } from './restaurant.service';
  
  @ApiTags('Рестораны')
  @ApiBearerAuth()
  @Controller('restaurants')
  export class RestaurantController {
	constructor(private readonly restaurantService: RestaurantService) {}
  
	@Get()
	@ApiOperation({ summary: 'Получить все рестораны' })
	@ApiOkResponse({ description: 'Список ресторанов успешно получен' })
	async getAll() {
	  return this.restaurantService.getAll();
	}
  
	@Post()
	@UsePipes(new ValidationPipe())
	@HttpCode(200)
	@Auth()
	@ApiOperation({ summary: 'Создать новый ресторан' })
	@ApiBody({ type: CreateRestaurantDto })
	@ApiCreatedResponse({ description: 'Ресторан успешно создан' })
	@ApiBadRequestResponse({ description: 'Некорректные данные' })
	@ApiUnauthorizedResponse({ description: 'Не авторизован' })
	async create(@Body() dto: CreateRestaurantDto) {
	  return this.restaurantService.create(dto);
	}
  
	@Put(':id')
	@UsePipes(new ValidationPipe())
	@HttpCode(200)
	@Auth()
	@ApiOperation({ summary: 'Обновить ресторан' })
	@ApiParam({ name: 'id', description: 'ID ресторана' })
	@ApiBody({ type: CreateRestaurantDto })
	@ApiOkResponse({ description: 'Ресторан успешно обновлен' })
	@ApiNotFoundResponse({ description: 'Ресторан не найден' })
	@ApiBadRequestResponse({ description: 'Некорректные данные' })
	async update(
	  @Param('id') restaurantId: string,
	  @Body() dto: CreateRestaurantDto
	) {
	  return this.restaurantService.update(restaurantId, dto);
	}
  
	@Get('by-id/:id')
	@ApiOperation({ summary: 'Получить ресторан по ID' })
	@ApiParam({ name: 'id', description: 'ID ресторана' })
	@ApiOkResponse({ description: 'Ресторан найден' })
	@ApiNotFoundResponse({ description: 'Ресторан не найден' })
	async getById(@Param('id') restaurantId: string) {
	  return this.restaurantService.getById(restaurantId);
	}
  
	@Delete(':id')
	@HttpCode(200)
	@Auth()
	@ApiOperation({ summary: 'Удалить ресторан' })
	@ApiParam({ name: 'id', description: 'ID ресторана' })
	@ApiOkResponse({ description: 'Ресторан успешно удален' })
	@ApiNotFoundResponse({ description: 'Ресторан не найден' })
	async delete(@Param('id') restaurantId: string) {
	  return this.restaurantService.delete(restaurantId);
	}
  
	@Post(':restaurantId/users')
	@HttpCode(200)
	@Auth()
	@ApiOperation({ summary: 'Добавить пользователя в ресторан' })
	@ApiParam({ name: 'restaurantId', description: 'ID ресторана' })
	@ApiBody({ type: AddUserDto })
	@ApiOkResponse({ description: 'Пользователь успешно добавлен' })
	@ApiNotFoundResponse({ description: 'Ресторан или пользователь не найден' })
	async addUser(
	  @Param('restaurantId') restaurantId: string,
	  @Body() addUserDto: AddUserDto
	) {
	  return this.restaurantService.addUserToRestaurant(
		restaurantId,
		addUserDto.userId
	  );
	}
  
	@Delete(':restaurantId/users/:userId')
	@HttpCode(200)
	@Auth()
	@ApiOperation({ summary: 'Удалить пользователя из ресторана' })
	@ApiParam({ name: 'restaurantId', description: 'ID ресторана' })
	@ApiParam({ name: 'userId', description: 'ID пользователя' })
	@ApiOkResponse({ description: 'Пользователь успешно удален' })
	@ApiNotFoundResponse({ description: 'Ресторан или пользователь не найден' })
	async removeUser(
	  @Param('restaurantId') restaurantId: string,
	  @Param('userId') userId: string
	) {
	  return this.restaurantService.removeUserFromRestaurant(
		restaurantId,
		userId
	  );
	}
  
	@Get(':restaurantId/users')
	@ApiOperation({ summary: 'Получить всех пользователей ресторана' })
	@ApiParam({ name: 'restaurantId', description: 'ID ресторана' })
	@ApiOkResponse({ description: 'Список пользователей успешно получен' })
	@ApiNotFoundResponse({ description: 'Ресторан не найден' })
	async getUsers(@Param('restaurantId') restaurantId: string) {
	  return this.restaurantService.getRestaurantUsers(restaurantId);
	}
  
	@Post(':restaurantId/products')
	@HttpCode(200)
	@Auth()
	@ApiOperation({ summary: 'Добавить продукт в ресторан' })
	@ApiParam({ name: 'restaurantId', description: 'ID ресторана' })
	@ApiBody({ type: AddProductDto })
	@ApiOkResponse({ description: 'Продукт успешно добавлен' })
	@ApiNotFoundResponse({ description: 'Ресторан или продукт не найден' })
	@ApiConflictResponse({ description: 'Продукт уже добавлен в ресторан' })
	async addProduct(
	  @Param('restaurantId') restaurantId: string,
	  @Body() addProductDto: AddProductDto
	) {
	  return this.restaurantService.addProductToRestaurant(
		restaurantId,
		addProductDto.productId
	  );
	}
  
	@Delete(':restaurantId/products/:productId')
	@HttpCode(200)
	@Auth()
	@ApiOperation({ summary: 'Удалить продукт из ресторана' })
	@ApiParam({ name: 'restaurantId', description: 'ID ресторана' })
	@ApiParam({ name: 'productId', description: 'ID продукта' })
	@ApiOkResponse({ description: 'Продукт успешно удален' })
	@ApiNotFoundResponse({ description: 'Ресторан или продукт не найде	н' })
	@ApiConflictResponse({ description: 'Продукт не найден в ресторане' })
	async removeProduct(
	  @Param('restaurantId') restaurantId: string,
	  @Param('productId') productId: string
	) {
	  return this.restaurantService.removeProductFromRestaurant(
		restaurantId,
		productId
	  );
	}
  
	@Get(':restaurantId/products')
	@ApiOperation({ summary: 'Получить все продукты ресторана' })
	@ApiParam({ name: 'restaurantId', description: 'ID ресторана' })
	@ApiOkResponse({ description: 'Список продуктов успешно получен' })
	@ApiNotFoundResponse({ description: 'Ресторан не найден' })
	async getProducts(@Param('restaurantId') restaurantId: string) {
	  return this.restaurantService.getRestaurantProducts(restaurantId);
	}

	
  }