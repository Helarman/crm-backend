import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { DiscountsService } from './discounts.service';
import {
  CreateDiscountDto,
  UpdateDiscountDto,
  DiscountResponseDto,
  ProductDiscountsDto,
} from './dto/index'
import { Discount } from '@prisma/client';

@ApiTags('Discounts')
@ApiBearerAuth()
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new discount' })
  @ApiResponse({
    status: 201,
    description: 'Discount created successfully',
    type: DiscountResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createDiscount(@Body() dto: CreateDiscountDto): Promise<Discount> {
    return this.discountsService.createDiscount(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all discounts' })
  @ApiResponse({
    status: 200,
    description: 'List of discounts',
    type: [DiscountResponseDto]
  })
  async getAllDiscounts(): Promise<Discount[]> {
    return this.discountsService.findAllDiscounts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get discount by ID' })
  @ApiResponse({
    status: 200,
    description: 'Discount details',
    type: DiscountResponseDto
  })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  async getDiscountById(@Param('id') id: string): Promise<Discount> {
    return this.discountsService.findDiscountById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update discount' })
  @ApiResponse({
    status: 200,
    description: 'Updated discount',
    type: DiscountResponseDto
  })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async updateDiscount(
    @Param('id') id: string,
    @Body() dto: UpdateDiscountDto,
  ): Promise<Discount> {
    return this.discountsService.updateDiscount(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete discount' })
  @ApiResponse({
    status: 200,
    description: 'Discount deleted',
    type: DiscountResponseDto
  })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  async deleteDiscount(@Param('id') id: string): Promise<Discount> {
    return this.discountsService.deleteDiscount(id);
  }


  @Get('restaurant/:restaurantId')
  @ApiOperation({ summary: 'Get discounts by restaurant ID' })
  @ApiResponse({
    status: 200,
    description: 'List of discounts for restaurant',
    type: [DiscountResponseDto]
  })
  async getDiscountsByRestaurant(
    @Param('restaurantId') restaurantId: string
  ): Promise<Discount[]> {
    return this.discountsService.findDiscountsByRestaurant(restaurantId);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get discounts by product ID' })
  @ApiResponse({
    status: 200,
    description: 'List of discounts for product',
    type: [DiscountResponseDto]
  })
  async getDiscountsByProduct(
    @Param('productId') productId: string
  ): Promise<Discount[]> {
    return this.discountsService.findDiscountsByProduct(productId);
  }

  @Post('products')
  @ApiOperation({ summary: 'Get discounts for multiple products' })
  @ApiResponse({
    status: 200,
    description: 'List of discounts for products',
    type: [DiscountResponseDto]
  })
  async getDiscountsByProducts(
    @Body() dto: ProductDiscountsDto
  ): Promise<Discount[]> {
    return this.discountsService.findDiscountsByProducts(dto.productIds);
  }


  @Get('promo/:code')
  @ApiOperation({ summary: 'Get discount by promo code' })
  @ApiResponse({
    status: 200,
    description: 'Discount details',
    type: DiscountResponseDto
  })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  async getDiscountByPromoCode(
    @Param('code') code: string
  ): Promise<Discount> {
    return this.discountsService.findDiscountByPromoCode(code);
  }
  @Get('network/:networkId')
  @ApiOperation({ summary: 'Get all discounts for a network' })
  @ApiParam({ name: 'networkId', description: 'Network ID' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Include inactive discounts' })
  @ApiQuery({ name: 'onlyActive', required: false, type: Boolean, description: 'Show only active discounts' })
  @ApiResponse({ status: 200, description: 'Returns discounts for the network' })
  @ApiResponse({ status: 404, description: 'Network not found' })
  async getDiscountsByNetwork(
    @Param('networkId') networkId: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('onlyActive') onlyActive?: string,
  ): Promise<Discount[]> {
    return this.discountsService.findDiscountsByNetwork(networkId, {
      includeInactive: includeInactive === 'true',
      onlyActive: onlyActive === 'true',
    });
  }

  @Get('network/:networkId/available')
  @ApiOperation({ summary: 'Get available discounts for a network' })
  @ApiParam({ name: 'networkId', description: 'Network ID' })
  @ApiQuery({ name: 'includeCodeDiscounts', required: false, type: Boolean, description: 'Include discounts with codes' })
  @ApiQuery({ name: 'targetType', required: false, enum: ['ALL', 'PRODUCT'], description: 'Filter by target type' })
  @ApiQuery({ name: 'orderType', required: false, type: String, description: 'Filter by order type' })
  @ApiQuery({ name: 'minAmount', required: false, type: Number, description: 'Minimum order amount' })
  @ApiResponse({ status: 200, description: 'Returns available discounts' })
  @ApiResponse({ status: 404, description: 'Network not found' })
  async getAvailableDiscountsForNetwork(
    @Param('networkId') networkId: string,
    @Query('includeCodeDiscounts') includeCodeDiscounts?: string,
    @Query('targetType') targetType?: string,
    @Query('orderType') orderType?: string,
    @Query('minAmount') minAmount?: string,
  ): Promise<Discount[]> {
    return this.discountsService.findAvailableDiscountsForNetwork(networkId, {
      includeCodeDiscounts: includeCodeDiscounts === 'true',
      targetType: targetType as any,
      orderType,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
    });
  }
}