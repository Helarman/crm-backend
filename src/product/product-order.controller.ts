import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
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
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ProductService } from './product.service';

@ApiTags('Продукты - Управление порядком')
@ApiBearerAuth()
@Controller('products/order')
export class ProductOrderController {
  constructor(private readonly productService: ProductService) {}

  @Patch('admin/:productId')
  @HttpCode(200)
  @Auth()
  @ApiOperation({ summary: 'Обновить порядок продукта в админке' })
  @ApiParam({ name: 'productId', description: 'ID продукта' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        newOrder: { type: 'number', description: 'Новая позиция в порядке' },
        categoryId: { type: 'string', description: 'ID категории' }
      }
    }
  })
  @ApiOkResponse({ description: 'Порядок успешно обновлен' })
  @ApiNotFoundResponse({ description: 'Продукт не найден' })
  @ApiBadRequestResponse({ description: 'Некорректные данные' })
  async updateAdminOrder(
    @Param('productId') productId: string,
    @Body() body: { newOrder: number; categoryId: string }
  ) {
    return this.productService.updateProductOrder(productId, body.newOrder, body.categoryId);
  }

  @Patch('client/:productId')
  @HttpCode(200)
  @Auth()
  @ApiOperation({ summary: 'Обновить клиентский порядок продукта' })
  @ApiParam({ name: 'productId', description: 'ID продукта' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        newOrder: { type: 'number', description: 'Новая позиция в порядке' },
        categoryId: { type: 'string', description: 'ID категории' }
      }
    }
  })
  @ApiOkResponse({ description: 'Клиентский порядок успешно обновлен' })
  @ApiNotFoundResponse({ description: 'Продукт не найден' })
  @ApiBadRequestResponse({ description: 'Некорректные данные' })
  async updateClientOrder(
    @Param('productId') productId: string,
    @Body() body: { newOrder: number; categoryId: string }
  ) {
    return this.productService.updateClientProductOrder(productId, body.newOrder, body.categoryId);
  }

  @Post('admin/:productId/move-up')
  @HttpCode(200)
  @Auth()
  @ApiOperation({ summary: 'Поднять продукт в порядке админки' })
  @ApiParam({ name: 'productId', description: 'ID продукта' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        categoryId: { type: 'string', description: 'ID категории' }
      }
    }
  })
  @ApiOkResponse({ description: 'Продукт успешно поднят' })
  @ApiNotFoundResponse({ description: 'Продукт не найден' })
  @ApiBadRequestResponse({ description: 'Продукт уже на первой позиции' })
  async moveUpAdmin(
    @Param('productId') productId: string,
    @Body() body: { categoryId: string }
  ) {
    return this.productService.moveProductUp(productId, body.categoryId);
  }

  @Post('admin/:productId/move-down')
  @HttpCode(200)
  @Auth()
  @ApiOperation({ summary: 'Опустить продукт в порядке админки' })
  @ApiParam({ name: 'productId', description: 'ID продукта' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        categoryId: { type: 'string', description: 'ID категории' }
      }
    }
  })
  @ApiOkResponse({ description: 'Продукт успешно опущен' })
  @ApiNotFoundResponse({ description: 'Продукт не найден' })
  @ApiBadRequestResponse({ description: 'Продукт уже на последней позиции' })
  async moveDownAdmin(
    @Param('productId') productId: string,
    @Body() body: { categoryId: string }
  ) {
    return this.productService.moveProductDown(productId, body.categoryId);
  }

  @Post('client/:productId/move-up')
  @HttpCode(200)
  @Auth()
  @ApiOperation({ summary: 'Поднять продукт в клиентском порядке' })
  @ApiParam({ name: 'productId', description: 'ID продукта' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        categoryId: { type: 'string', description: 'ID категории' }
      }
    }
  })
  @ApiOkResponse({ description: 'Продукт успешно поднят' })
  @ApiNotFoundResponse({ description: 'Продукт не найден' })
  @ApiBadRequestResponse({ description: 'Продукт уже на первой позиции' })
  async moveUpClient(
    @Param('productId') productId: string,
    @Body() body: { categoryId: string }
  ) {
    return this.productService.moveProductUpOnClient(productId, body.categoryId);
  }

  @Post('client/:productId/move-down')
  @HttpCode(200)
  @Auth()
  @ApiOperation({ summary: 'Опустить продукт в клиентском порядке' })
  @ApiParam({ name: 'productId', description: 'ID продукта' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        categoryId: { type: 'string', description: 'ID категории' }
      }
    }
  })
  @ApiOkResponse({ description: 'Продукт успешно опущен' })
  @ApiNotFoundResponse({ description: 'Продукт не найден' })
  @ApiBadRequestResponse({ description: 'Продукт уже на последней позиции' })
  async moveDownClient(
    @Param('productId') productId: string,
    @Body() body: { categoryId: string }
  ) {
    return this.productService.moveProductDownOnClient(productId, body.categoryId);
  }

  @Get('category/:categoryId')
  @Auth()
  @ApiOperation({ summary: 'Получить продукты категории с порядком' })
  @ApiParam({ name: 'categoryId', description: 'ID категории (или "uncategorized" для продуктов без категории)' })
  @ApiOkResponse({ description: 'Продукты категории получены' })
  async getCategoryProducts(@Param('categoryId') categoryId: string) {
    return this.productService.getCategoryProducts(categoryId);
  }

  @Post('admin/normalize/:categoryId')
  @HttpCode(200)
  @Auth()
  @ApiOperation({ summary: 'Нормализовать порядок в админке для категории' })
  @ApiParam({ name: 'categoryId', description: 'ID категории (или "uncategorized" для продуктов без категории)' })
  @ApiOkResponse({ description: 'Порядок нормализован' })
  async normalizeAdminOrder(@Param('categoryId') categoryId: string) {
    const normalizedCategoryId = categoryId === 'uncategorized' ? null : categoryId;
    const count = await this.productService.normalizeCategoryOrders(normalizedCategoryId);
    return { message: `Порядок нормализован для ${count} продуктов` };
  }

  @Post('client/normalize/:categoryId')
  @HttpCode(200)
  @Auth()
  @ApiOperation({ summary: 'Нормализовать клиентский порядок для категории' })
  @ApiParam({ name: 'categoryId', description: 'ID категории (или "uncategorized" для продуктов без категории)' })
  @ApiOkResponse({ description: 'Клиентский порядок нормализован' })
  async normalizeClientOrder(@Param('categoryId') categoryId: string) {
    const normalizedCategoryId = categoryId === 'uncategorized' ? null : categoryId;
    const count = await this.productService.normalizeCategoryClientOrders(normalizedCategoryId);
    return { message: `Клиентский порядок нормализован для ${count} продуктов` };
  }
}