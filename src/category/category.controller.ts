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
	ValidationPipe,
  } from '@nestjs/common';
  import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
  import { Auth } from 'src/auth/decorators/auth.decorator';
  import { CategoryService } from './category.service';
  import { CategoryDto } from './dto/category.dto';
  
  @ApiTags('Категории')
  @Controller('categories')
  export class CategoryController {
	constructor(private readonly categoryService: CategoryService) {}
  
	@ApiOperation({ summary: 'Получить категорию по ID' }) 
	@ApiParam({ name: 'id', description: 'ID категории' }) 
	@ApiResponse({ status: 200, description: 'Категория найдена' })
	@ApiResponse({ status: 404, description: 'Категория не найдена' })
	@Get('by-id/:id')
	async getById(@Param('id') id: string) {
	  return this.categoryService.getById(id);
	}
  
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Создать новую категорию' })
	@ApiBody({ type: CategoryDto, description: 'Данные для создания категории' })
	@ApiResponse({ status: 200, description: 'Категория успешно создана' })
	@ApiResponse({ status: 400, description: 'Некорректные данные' })
	@ApiResponse({ status: 401, description: 'Не авторизован' })
	@Auth()
	@Post()
	@HttpCode(200)
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
	async create(@Body() dto: CategoryDto) {
	  return this.categoryService.create(dto);
	}
  
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Обновить категорию' })
	@ApiParam({ name: 'id', description: 'ID категории' })
	@ApiBody({ type: CategoryDto, description: 'Новые данные категории' })
	@ApiResponse({ status: 200, description: 'Категория успешно обновлена' })
	@ApiResponse({ status: 404, description: 'Категория не найдена' })
	@UsePipes(new ValidationPipe())
	@HttpCode(200)
	@Auth()
	@Put(':id')
	async update(@Param('id') id: string, @Body() dto: CategoryDto) {
	  return this.categoryService.update(id, dto);
	}
  
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Удалить категорию' })
	@ApiParam({ name: 'id', description: 'ID категории' })
	@ApiResponse({ status: 200, description: 'Категория успешно удалена' })
	@ApiResponse({ status: 404, description: 'Категория не найдена' })
	@HttpCode(200)
	@Auth()
	@Delete(':id')
	async delete(@Param('id') id: string) {
	  return this.categoryService.delete(id);
	}

	@ApiOperation({ summary: 'Получить продукты по категории' })
	@ApiParam({ name: 'id', description: 'ID категории' })
	@ApiResponse({ status: 200, description: 'Продукты найдены' })
	@ApiResponse({ status: 404, description: 'Категория не найдена' })
	@Get(':id/products')
	async getProductsByCategory(@Param('id') id: string) {
	return this.categoryService.getProductsByCategory(id);
	}

	@ApiOperation({ summary: 'Получить все категории' })
	@ApiResponse({ 
	status: 200, 
	description: 'Список всех категорий',
	type: [CategoryDto]
	})
	@Get()
	async getAll() {
	return this.categoryService.getAll();
	}
  }