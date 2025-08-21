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
  
  @ApiTags('Модификаторы к блюдам')
  @Controller('additives')
  export class AdditiveController {
    constructor(private readonly additiveService: AdditiveService) {}
  
    @Post()
    @ApiOperation({ summary: 'Создать новую модификатор' })
    @ApiResponse({ status: 201, description: 'Модификатор успешно создана' })
    @ApiBody({ type: CreateAdditiveDto })
    create(@Body() createAdditiveDto: CreateAdditiveDto): Promise<any> {
      return this.additiveService.create(createAdditiveDto);
    }
  
    @Get()
    @ApiOperation({ summary: 'Получить все Модификаторы' })
    @ApiResponse({ status: 200, description: 'Список всех добавок' })
    findAll(): Promise<any[]> {
      return this.additiveService.findAll();
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Получить модификатор по ID' })
    @ApiParam({ name: 'id', description: 'ID Модификаторы' })
    @ApiResponse({ status: 200, description: 'Найденная Модификатор' })
    @ApiResponse({ status: 404, description: 'Модификатор не найдена' })
    findOne(@Param('id') id: string): Promise<AdditiveWithProducts | null> {
      return this.additiveService.findOne(id);
    }
  
    @Patch(':id')
    @ApiOperation({ summary: 'Обновить модификатор' })
    @ApiParam({ name: 'id', description: 'ID Модификаторы' })
    @ApiBody({ type: UpdateAdditiveDto })
    @ApiResponse({ status: 200, description: 'Обновленная Модификатор' })
    update(
      @Param('id') id: string,
      @Body() updateAdditiveDto: UpdateAdditiveDto,
    ): Promise<AdditiveWithProducts> {
      return this.additiveService.update(id, updateAdditiveDto);
    }
  
    @Delete(':id')
    @ApiOperation({ summary: 'Удалить модификатор' })
    @ApiParam({ name: 'id', description: 'ID Модификаторы' })
    @ApiResponse({ status: 200, description: 'Удаленная Модификатор' })
    remove(@Param('id') id: string): Promise<AdditiveWithProducts> {
      return this.additiveService.remove(id);
    }
  
    @Post(':additiveId/products/:productId')
    @ApiOperation({ summary: 'Добавить модификатор к продукту' })
    @ApiParam({ name: 'additiveId', description: 'ID Модификаторы' })
    @ApiParam({ name: 'productId', description: 'ID продукта' })
    @ApiResponse({ status: 200, description: 'Модификатор привязана к продукту' })
    addToProduct(
      @Param('additiveId') additiveId: string,
      @Param('productId') productId: string,
    ): Promise<AdditiveWithProducts> {
      return this.additiveService.addToProduct(additiveId, productId);
    }
  
    @Delete(':additiveId/products/:productId')
    @ApiOperation({ summary: 'Удалить модификатор из продукта' })
    @ApiParam({ name: 'additiveId', description: 'ID Модификаторы' })
    @ApiParam({ name: 'productId', description: 'ID продукта' })
    @ApiResponse({ status: 200, description: 'Модификатор отвязана от продукта' })
    removeFromProduct(
      @Param('additiveId') additiveId: string,
      @Param('productId') productId: string,
    ): Promise<AdditiveWithProducts> {
      return this.additiveService.removeFromProduct(additiveId, productId);
    }

    @Get('product/:productId')
    @ApiOperation({ summary: 'Получить Модификаторы продукта' })
    @ApiParam({ name: 'productId', description: 'ID продукта' })
    async getProductAdditives(@Param('productId') productId: string) {
    return this.additiveService.getProductAdditives(productId);
    }

    @Put('product/:productId')
    @ApiOperation({ summary: 'Обновить Модификаторы продукта' })
    @ApiParam({ name: 'productId', description: 'ID продукта' })
    @ApiBody({ type: UpdateProductAdditivesDto })
    @ApiResponse({ status: 200, description: 'Обновленные Модификаторы продукта' })
    @ApiResponse({ status: 404, description: 'Продукт не найден' })
    async updateProductAdditives(
      @Param('productId') productId: string,
      @Body() updateDto: UpdateProductAdditivesDto,
    ): Promise<AdditiveWithProducts[]> {
      return this.additiveService.updateProductAdditives(productId, updateDto.additiveIds);
    }
  }