import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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
  constructor(private readonly discountsService: DiscountsService) {}

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

}