import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	Post,
	Put,
	Query,
	UsePipes,
	ValidationPipe
  } from '@nestjs/common';
  import { 
	ApiTags, 
	ApiOperation, 
	ApiResponse, 
	ApiParam, 
	ApiBody, 
	ApiBearerAuth,
	ApiQuery,
	ApiOkResponse,
	ApiCreatedResponse,
	ApiNotFoundResponse,
	ApiBadRequestResponse,
	ApiUnauthorizedResponse
  } from '@nestjs/swagger';
  import { Auth } from 'src/auth/decorators/auth.decorator';
  import { ProductDto } from './dto/product.dto';
  import { ProductService } from './product.service';
  
  @ApiTags('Товары')
  @ApiBearerAuth()
  @Controller('products')
  export class ProductController {
	constructor(private readonly productService: ProductService) {}
  
	@Get()
	@ApiOperation({ summary: 'Получить все товары' })
	@ApiQuery({ 
	  name: 'searchTerm', 
	  required: false,
	  description: 'Поисковая строка для фильтрации товаров'
	})
	@ApiOkResponse({ description: 'Список товаров успешно получен' })
	async getAll(@Query('searchTerm') searchTerm?: string) {
	  return this.productService.getAll(searchTerm);
	}
  
	@Get('by-id/:id')
	@ApiOperation({ summary: 'Получить товар по ID' })
	@ApiParam({ name: 'id', description: 'ID товара' })
	@ApiOkResponse({ description: 'Товар найден' })
	@ApiNotFoundResponse({ description: 'Товар не найден' })
	async getById(@Param('id') id: string) {
	  return this.productService.getById(id);
	}
  
	@Post()
	@UsePipes(new ValidationPipe())
	@HttpCode(200)
	@Auth()
	@ApiOperation({ summary: 'Создать новый товар' })
	@ApiBody({ type: ProductDto, description: 'Данные для создания товара' })
	@ApiCreatedResponse({ description: 'Товар успешно создан' })
	@ApiBadRequestResponse({ description: 'Некорректные данные' })
	@ApiUnauthorizedResponse({ description: 'Не авторизован' })
	async create(@Body() dto: ProductDto) {
	  return this.productService.create(dto);
	}
  
	@Put(':id')
	@UsePipes(new ValidationPipe())
	@HttpCode(200)
	@Auth()
	@ApiOperation({ summary: 'Обновить товар' })
	@ApiParam({ name: 'id', description: 'ID товара' })
	@ApiBody({ type: ProductDto, description: 'Новые данные товара' })
	@ApiOkResponse({ description: 'Товар успешно обновлен' })
	@ApiNotFoundResponse({ description: 'Товар не найден' })
	@ApiBadRequestResponse({ description: 'Некорректные данные' })
	async update(@Param('id') id: string, @Body() dto: ProductDto) {
	  return this.productService.update(id, dto);
	}
  
	@Delete(':id')
	@HttpCode(200)
	@Auth()
	@ApiOperation({ summary: 'Удалить товар' })
	@ApiParam({ name: 'id', description: 'ID товара' })
	@ApiOkResponse({ description: 'Товар успешно удален' })
	@ApiNotFoundResponse({ description: 'Товар не найден' })
	async delete(@Param('id') id: string) {
	  return this.productService.delete(id);
	}

	@Get(':id/prices')
	@ApiOperation({ summary: 'Получить цены товара в ресторанах' })
	@ApiParam({ name: 'id', description: 'ID товара' })
	@ApiOkResponse({ description: 'Цены успешно получены' })
	@ApiNotFoundResponse({ description: 'Товар или цены не найдены' })
	async getRestaurantPrices(@Param('id') id: string) {
		return this.productService.getRestaurantPrices(id);
	}
}