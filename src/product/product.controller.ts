import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	Patch,
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
	constructor(private readonly productService: ProductService) { }

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

	@Get(':id/ingredients')
	@ApiOperation({ summary: 'Получить ингредиенты продукта' })
	@ApiParam({ name: 'id', description: 'ID продукта' })
	@ApiOkResponse({ description: 'Ингредиенты найдены' })
	async getIngredients(@Param('id') id: string) {
		return this.productService.getIngredients(id);
	}

	@Get('by-category/:categoryId')
	@ApiOperation({ summary: 'Получить товары по категории' })
	@ApiParam({
		name: 'categoryId',
		description: 'ID категории'
	})
	@ApiOkResponse({
		description: 'Список товаров категории успешно получен'
	})
	@ApiNotFoundResponse({
		description: 'Категория не найдена'
	})
	async getByCategory(@Param('categoryId') categoryId: string) {
		return this.productService.getByCategory(categoryId);
	}

	@Put(':id/toggle-print-labels')
	@HttpCode(200)
	@ApiOperation({ summary: 'Переключить флаг печати этикеток' })
	@ApiParam({ name: 'id', description: 'ID товара' })
	@ApiOkResponse({ description: 'Флаг успешно изменен' })
	@ApiNotFoundResponse({ description: 'Товар не найден' })
	async togglePrintLabels(@Param('id') id: string) {
		return this.productService.togglePrintLabels(id);
	}

	@Put(':id/toggle-published-on-website')
	@HttpCode(200)
	@ApiOperation({ summary: 'Переключить флаг публикации на сайте' })
	@ApiParam({ name: 'id', description: 'ID товара' })
	@ApiOkResponse({ description: 'Флаг успешно изменен' })
	@ApiNotFoundResponse({ description: 'Товар не найден' })
	async togglePublishedOnWebsite(@Param('id') id: string) {
		return this.productService.togglePublishedOnWebsite(id);
	}

	@Put(':id/toggle-published-in-app')
	@HttpCode(200)
	@ApiOperation({ summary: 'Переключить флаг публикации в приложении' })
	@ApiParam({ name: 'id', description: 'ID товара' })
	@ApiOkResponse({ description: 'Флаг успешно изменен' })
	@ApiNotFoundResponse({ description: 'Товар не найден' })
	async togglePublishedInApp(@Param('id') id: string) {
		return this.productService.togglePublishedInApp(id);
	}

	@Put(':id/toggle-stop-list')
	@HttpCode(200)
	@ApiOperation({ summary: 'Переключить флаг стоп-листа' })
	@ApiParam({ name: 'id', description: 'ID товара' })
	@ApiOkResponse({ description: 'Флаг успешно изменен' })
	@ApiNotFoundResponse({ description: 'Товар не найден' })
	async toggleStopList(@Param('id') id: string) {
		return this.productService.toggleStopList(id);
	}

	@Post(':id/sort-order')
	async updateSortOrder(
		@Param('id') id: string,
		@Body() body: { sortOrder: number }
	) {
		return this.productService.updateSortOrder(id, body.sortOrder);
	}



	@Get('category/:categoryId/order-stats')
	async getCategoryOrderStats(@Param('categoryId') categoryId: string) {
		const products = await this.productService.getByCategory(categoryId);
		return {
			count: products.length,
			minOrder: Math.min(...products.map(p => p.sortOrder)),
			maxOrder: Math.max(...products.map(p => p.sortOrder)),
			products: products.map(p => ({
				id: p.id,
				title: p.title,
				sortOrder: p.sortOrder
			}))
		};
	}

	@Post(':id/client-sort-order')
	async updateClientSortOrder(
		@Param('id') id: string,
		@Body() body: { clientSortOrder: number }
	) {
		return this.productService.updateClientSortOrder(id, body.clientSortOrder);
	}

	@Get('category/:categoryId/client-order-stats')
	async getCategoryClientOrderStats(@Param('categoryId') categoryId: string) {
		return this.productService.getCategoryClientOrderStats(categoryId);
	}

	@Post('normalize-orders')
	async normalizeOrders(@Body() body: { categoryId?: string }) {
		return this.productService.normalizeCategoryOrders(body.categoryId);
	}

	@Post('normalize-client-orders')
	async normalizeClientOrders(@Body() body: { categoryId?: string }) {
		return this.productService.normalizeCategoryClientOrders(body.categoryId);
	}

	@Post('assign-network')
	@Auth()
	@ApiOperation({ summary: 'Назначить сеть продуктам' })
	@ApiBody({ 
		description: 'Данные для назначения сети',
		schema: {
		type: 'object',
		properties: {
			networkId: { type: 'string' },
			productIds: { 
			type: 'array',
			items: { type: 'string' },
			nullable: true 
			}
		}
		}
	})
	@ApiOkResponse({ description: 'Сеть успешно назначена продуктам' })
	@ApiBadRequestResponse({ description: 'Некорректные данные' })
	async assignNetworkToProducts(
		@Body() body: { networkId: string; productIds?: string[] }
	) {
		return this.productService.assignNetworkToProducts(body.networkId, body.productIds);
	}

	@Get('without-network')
	@ApiOperation({ summary: 'Получить продукты без сети' })
	@ApiOkResponse({ description: 'Продукты успешно получены' })
	async getProductsWithoutNetwork() {
		return this.productService.getProductsWithoutNetwork();
	}

	@Get('by-network/:networkId')
	@ApiOperation({ summary: 'Получить продукты по сети' })
	@ApiParam({ name: 'networkId', description: 'ID сети' })
	@ApiOkResponse({ description: 'Продукты успешно получены' })
	@ApiNotFoundResponse({ description: 'Сеть не найдена' })
	async getProductsByNetwork(@Param('networkId') networkId: string) {
		return this.productService.getProductsByNetwork(networkId);
	}
	
	@Post('delete-multiple')
	@HttpCode(200)
	@Auth()
	@ApiOperation({ summary: 'Массовое удаление продуктов' })
	@ApiBody({
	description: 'Массив ID продуктов для удаления',
	schema: {
		type: 'object',
		properties: {
		productIds: {
			type: 'array',
			items: { type: 'string' }
		}
		}
	}
	})
	@ApiOkResponse({ description: 'Продукты успешно удалены' })
	async deleteMultiple(@Body() body: { productIds: string[] }) {
	return this.productService.deleteMultiple(body.productIds);
	}

	@Post('restore')
	@HttpCode(200)
	@Auth()
	@ApiOperation({ summary: 'Восстановить удаленные продукты' })
	@ApiBody({
	description: 'Массив ID продуктов для восстановления',
	schema: {
		type: 'object',
		properties: {
		productIds: {
			type: 'array',
			items: { type: 'string' }
		}
		}
	}
	})
	@ApiOkResponse({ description: 'Продукты успешно восстановлены' })
	async restoreProducts(@Body() body: { productIds: string[] }) {
	return this.productService.restoreProducts(body.productIds);
	}

	@Post('update-category-multiple')
	@HttpCode(200)
	@Auth()
	@ApiOperation({ summary: 'Массовая смена категории продуктов' })
	@ApiBody({
	description: 'Данные для массовой смены категории',
	schema: {
		type: 'object',
		properties: {
		productIds: {
			type: 'array',
			items: { type: 'string' }
		},
		categoryId: {
			type: 'string',
			nullable: true
		}
		}
	}
	})
	@ApiOkResponse({ description: 'Категория продуктов успешно обновлена' })
	async updateCategoryForMultiple(@Body() body: { productIds: string[]; categoryId?: string }) {
	return this.productService.updateCategoryForMultiple(body.productIds, body.categoryId);
	}

	@Post('assign-workshops-multiple')
	@HttpCode(200)
	@Auth()
	@ApiOperation({ summary: 'Массовое назначение цехов продуктам' })
	@ApiBody({
	description: 'Данные для массового назначения цехов',
	schema: {
		type: 'object',
		properties: {
		productIds: {
			type: 'array',
			items: { type: 'string' }
		},
		workshopIds: {
			type: 'array',
			items: { type: 'string' }
		}
		}
	}
	})
	@ApiOkResponse({ description: 'Цеха успешно назначены продуктам' })
	async assignWorkshopsToMultiple(@Body() body: { productIds: string[]; workshopIds: string[] }) {
	return this.productService.assignWorkshopsToMultiple(body.productIds, body.workshopIds);
	}

	@Post('assign-additives-multiple')
	@HttpCode(200)
	@Auth()
	@ApiOperation({ summary: 'Массовое назначение модификаторов продуктам' })
	@ApiBody({
	description: 'Данные для массового назначения модификаторов',
	schema: {
		type: 'object',
		properties: {
		productIds: {
			type: 'array',
			items: { type: 'string' }
		},
		additiveIds: {
			type: 'array',
			items: { type: 'string' }
		}
		}
	}
	})
	@ApiOkResponse({ description: 'Модификаторы успешно назначены продуктам' })
	async assignAdditivesToMultiple(@Body() body: { productIds: string[]; additiveIds?: string[] }) {
	return this.productService.assignAdditivesToMultiple(body.productIds, body.additiveIds);
	}

	@Post('toggle-print-labels-multiple')
	@HttpCode(200)
	@Auth()
	@ApiOperation({ summary: 'Массовое включение/отключение печати лейблов' })
	@ApiBody({
	description: 'Данные для массового изменения печати лейблов',
	schema: {
		type: 'object',
		properties: {
		productIds: {
			type: 'array',
			items: { type: 'string' }
		},
		enable: {
			type: 'boolean'
		}
		}
	}
	})
	@ApiOkResponse({ description: 'Печать лейблов успешно изменена' })
	async togglePrintLabelsForMultiple(@Body() body: { productIds: string[]; enable: boolean }) {
	return this.productService.togglePrintLabelsForMultiple(body.productIds, body.enable);
	}

	@Post('toggle-published-website-multiple')
	@HttpCode(200)
	@Auth()
	@ApiOperation({ summary: 'Массовое включение/отключение публикации на сайте' })
	@ApiBody({
	description: 'Данные для массового изменения публикации на сайте',
	schema: {
		type: 'object',
		properties: {
		productIds: {
			type: 'array',
			items: { type: 'string' }
		},
		enable: {
			type: 'boolean'
		}
		}
	}
	})
	@ApiOkResponse({ description: 'Публикация на сайте успешно изменена' })
	async togglePublishedOnWebsiteForMultiple(@Body() body: { productIds: string[]; enable: boolean }) {
	return this.productService.togglePublishedOnWebsiteForMultiple(body.productIds, body.enable);
	}

	@Post('toggle-published-app-multiple')
	@HttpCode(200)
	@Auth()
	@ApiOperation({ summary: 'Массовое включение/отключение публикации в приложении' })
	@ApiBody({
	description: 'Данные для массового изменения публикации в приложении',
	schema: {
		type: 'object',
		properties: {
		productIds: {
			type: 'array',
			items: { type: 'string' }
		},
		enable: {
			type: 'boolean'
		}
		}
	}
	})
	@ApiOkResponse({ description: 'Публикация в приложении успешно изменена' })
	async togglePublishedInAppForMultiple(@Body() body: { productIds: string[]; enable: boolean }) {
	return this.productService.togglePublishedInAppForMultiple(body.productIds, body.enable);
	}

	@Post('toggle-stop-list-multiple')
	@HttpCode(200)
	@Auth()
	@ApiOperation({ summary: 'Массовое включение/отключение стоп-листа' })
	@ApiBody({
	description: 'Данные для массового изменения стоп-листа',
	schema: {
		type: 'object',
		properties: {
		productIds: {
			type: 'array',
			items: { type: 'string' }
		},
		enable: {
			type: 'boolean'
		}
		}
	}
	})
	@ApiOkResponse({ description: 'Стоп-лист успешно изменен' })
	async toggleStopListForMultiple(@Body() body: { productIds: string[]; enable: boolean }) {
	return this.productService.toggleStopListForMultiple(body.productIds, body.enable);
	}

	@Get('deleted')
	@Auth()
	@ApiOperation({ summary: 'Получить удаленные продукты' })
	@ApiQuery({
	name: 'searchTerm',
	required: false,
	description: 'Поисковая строка для фильтрации удаленных продуктов'
	})
	@ApiOkResponse({ description: 'Список удаленных продуктов успешно получен' })
	async getDeletedProducts(@Query('searchTerm') searchTerm?: string) {
	return this.productService.getDeletedProducts(searchTerm);
	}

	@Delete('hard-delete/:id')
	@HttpCode(200)
	@Auth()
	@ApiOperation({ summary: 'Полное удаление продукта (только для администратора)' })
	@ApiParam({ name: 'id', description: 'ID продукта' })
	@ApiOkResponse({ description: 'Продукт полностью удален' })
	@ApiNotFoundResponse({ description: 'Продукт не найден' })
	async hardDelete(@Param('id') id: string) {
	return this.productService.hardDelete(id);
	}
}