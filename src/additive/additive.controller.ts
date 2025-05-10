import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Put
  } from '@nestjs/common';
  import { AdditiveService } from './additive.service';
  import { CreateAdditiveDto } from './dto/create-additive.dto';
  import { UpdateAdditiveDto } from './dto/update-additive.dto';
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBody,
    ApiParam,
  } from '@nestjs/swagger';
  import {AdditiveWithProducts} from './interfaces/additive.interface'
  import { UpdateProductAdditivesDto } from './dto/update-product-additives.dto'
  
  @ApiTags('Добавки к блюдам')
  @Controller('additives')
  export class AdditiveController {
    constructor(private readonly additiveService: AdditiveService) {}
  
    @Post()
    @ApiOperation({ summary: 'Создать новую добавку' })
    @ApiResponse({ status: 201, description: 'Добавка успешно создана' })
    @ApiBody({ type: CreateAdditiveDto })
    create(@Body() createAdditiveDto: CreateAdditiveDto): Promise<any> {
      return this.additiveService.create(createAdditiveDto);
    }
  
    @Get()
    @ApiOperation({ summary: 'Получить все добавки' })
    @ApiResponse({ status: 200, description: 'Список всех добавок' })
    findAll(): Promise<any[]> {
      return this.additiveService.findAll();
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Получить добавку по ID' })
    @ApiParam({ name: 'id', description: 'ID добавки' })
    @ApiResponse({ status: 200, description: 'Найденная добавка' })
    @ApiResponse({ status: 404, description: 'Добавка не найдена' })
    findOne(@Param('id') id: string): Promise<AdditiveWithProducts | null> {
      return this.additiveService.findOne(id);
    }
  
    @Patch(':id')
    @ApiOperation({ summary: 'Обновить добавку' })
    @ApiParam({ name: 'id', description: 'ID добавки' })
    @ApiBody({ type: UpdateAdditiveDto })
    @ApiResponse({ status: 200, description: 'Обновленная добавка' })
    update(
      @Param('id') id: string,
      @Body() updateAdditiveDto: UpdateAdditiveDto,
    ): Promise<AdditiveWithProducts> {
      return this.additiveService.update(id, updateAdditiveDto);
    }
  
    @Delete(':id')
    @ApiOperation({ summary: 'Удалить добавку' })
    @ApiParam({ name: 'id', description: 'ID добавки' })
    @ApiResponse({ status: 200, description: 'Удаленная добавка' })
    remove(@Param('id') id: string): Promise<AdditiveWithProducts> {
      return this.additiveService.remove(id);
    }
  
    @Post(':additiveId/products/:productId')
    @ApiOperation({ summary: 'Добавить добавку к продукту' })
    @ApiParam({ name: 'additiveId', description: 'ID добавки' })
    @ApiParam({ name: 'productId', description: 'ID продукта' })
    @ApiResponse({ status: 200, description: 'Добавка привязана к продукту' })
    addToProduct(
      @Param('additiveId') additiveId: string,
      @Param('productId') productId: string,
    ): Promise<AdditiveWithProducts> {
      return this.additiveService.addToProduct(additiveId, productId);
    }
  
    @Delete(':additiveId/products/:productId')
    @ApiOperation({ summary: 'Удалить добавку из продукта' })
    @ApiParam({ name: 'additiveId', description: 'ID добавки' })
    @ApiParam({ name: 'productId', description: 'ID продукта' })
    @ApiResponse({ status: 200, description: 'Добавка отвязана от продукта' })
    removeFromProduct(
      @Param('additiveId') additiveId: string,
      @Param('productId') productId: string,
    ): Promise<AdditiveWithProducts> {
      return this.additiveService.removeFromProduct(additiveId, productId);
    }

    @Get('product/:productId')
    @ApiOperation({ summary: 'Получить добавки продукта' })
    @ApiParam({ name: 'productId', description: 'ID продукта' })
    async getProductAdditives(@Param('productId') productId: string) {
    return this.additiveService.getProductAdditives(productId);
    }

    @Put('product/:productId')
    @ApiOperation({ summary: 'Обновить добавки продукта' })
    @ApiParam({ name: 'productId', description: 'ID продукта' })
    @ApiBody({ type: UpdateProductAdditivesDto })
    @ApiResponse({ status: 200, description: 'Обновленные добавки продукта' })
    @ApiResponse({ status: 404, description: 'Продукт не найден' })
    async updateProductAdditives(
      @Param('productId') productId: string,
      @Body() updateDto: UpdateProductAdditivesDto,
    ): Promise<AdditiveWithProducts[]> {
      return this.additiveService.updateProductAdditives(productId, updateDto.additiveIds);
    }
  }