import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { DiscountResponseDto } from './dto/discount-response.dto';

@ApiTags('Discounts')
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new discount' })
  @ApiResponse({ status: 201, description: 'Discount created', type: DiscountResponseDto })
  create(@Body() createDiscountDto: CreateDiscountDto) {
    if (typeof createDiscountDto.value === 'string') {
      createDiscountDto.value = Number(createDiscountDto.value);
    }
    return this.discountsService.createDiscount(createDiscountDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all discounts' })
  @ApiResponse({ status: 200, description: 'List of discounts', type: [DiscountResponseDto] })
  findAll() {
    return this.discountsService.findAllDiscounts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get discount by ID' })
  @ApiResponse({ status: 200, description: 'Discount details', type: DiscountResponseDto })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  findOne(@Param('id') id: string) {
    return this.discountsService.findDiscountById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update discount' })
  @ApiResponse({ status: 200, description: 'Updated discount', type: DiscountResponseDto })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  update(
    @Param('id') id: string,
    @Body() updateDiscountDto: UpdateDiscountDto,
  ) {
    return this.discountsService.updateDiscount(id, updateDiscountDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete discount' })
  @ApiResponse({ status: 200, description: 'Discount deleted', type: DiscountResponseDto })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  remove(@Param('id') id: string) {
    return this.discountsService.deleteDiscount(id);
  }

  @Post(':id/apply/:orderId')
  @ApiOperation({ summary: 'Apply discount to order' })
  @ApiResponse({ status: 200, description: 'Discount applied to order' })
  @ApiResponse({ status: 404, description: 'Discount or order not found' })
  applyDiscount(
    @Param('id') discountId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.discountsService.applyDiscountToOrder(orderId, discountId);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get discount by code' })
  @ApiResponse({ status: 200, description: 'Discount details', type: DiscountResponseDto })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  findByCode(@Param('code') code: string) {
    return this.discountsService.findDiscountByCode(code);
  }

   @Get('active')
  @ApiOperation({ summary: 'Get all active discounts' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of active discounts', 
    type: [DiscountResponseDto] 
  })
  findActive() {
    return this.discountsService.findActiveDiscounts();
  }

  @Get('restaurant/:restaurantId')
  @ApiOperation({ summary: 'Get discounts by restaurant' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of discounts for restaurant',
    type: [DiscountResponseDto] 
  })
  findByRestaurant(@Param('restaurantId') restaurantId: string) {
    return this.discountsService.findDiscountsByRestaurant(restaurantId);
  }

  @Post('for-products')
  @ApiOperation({ summary: 'Get discounts for specific products' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of applicable discounts',
    type: [DiscountResponseDto] 
  })
  findForProducts(@Body() body: { productIds: string[] }) {
    return this.discountsService.findDiscountsForProducts(body.productIds);
  }

  @Post('for-categories')
  @ApiOperation({ summary: 'Get discounts for specific categories' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of applicable discounts',
    type: [DiscountResponseDto] 
  })
  findForCategories(@Body() body: { categoryIds: string[] }) {
    return this.discountsService.findDiscountsForCategories(body.categoryIds);
  }

  @Get(':id/check-min-amount')
  @ApiOperation({ summary: 'Check if order amount meets discount minimum' })
  @ApiResponse({ 
    status: 200, 
    description: 'Validation result',
    schema: { type: 'object', properties: { isValid: { type: 'boolean' } } }
  })
  async checkMinAmount(
    @Param('id') discountId: string,
    @Query('amount') amount: number
  ) {
    const isValid = await this.discountsService.checkMinOrderAmount(discountId, amount);
    return { isValid };
  }

  @Post(':id/generate-code')
  @ApiOperation({ summary: 'Generate promo code for customer' })
  @ApiResponse({ 
    status: 201, 
    description: 'Generated promo code',
    schema: { type: 'object', properties: { code: { type: 'string' } } }
  })
  async generatePromoCode(
    @Param('id') discountId: string,
    @Body() body: { customerId: string }
  ) {
    const code = await this.discountsService.generatePromoCode(discountId, body.customerId);
    return { code };
  }

  @Get('customer/:customerId/promocodes')
  @ApiOperation({ summary: 'Get customer promo codes' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of customer promo codes',
    type: [DiscountResponseDto] 
  })
  getCustomerPromoCodes(@Param('customerId') customerId: string) {
    return this.discountsService.getCustomerPromoCodes(customerId);
  }

  @Get('for-order-type/:orderType')
  @ApiOperation({ summary: 'Get discounts for specific order type' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of applicable discounts for order type',
    type: [DiscountResponseDto] 
  })
  findForOrderType(
    @Param('orderType') orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'BANQUET',
    @Query('restaurantId') restaurantId?: string
  ) {
    return this.discountsService.findDiscountsForOrderType(orderType, restaurantId);
  }

  @Post('for-current-order')
  @ApiOperation({ summary: 'Get discounts applicable to current order' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of applicable discounts for current order',
    type: [DiscountResponseDto] 
  })
  findForCurrentOrder(
    @Body() body: {
      orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'BANQUET',
      productIds: string[],
      categoryIds: string[],
      restaurantId?: string
    }
  ) {
    return this.discountsService.findDiscountsForCurrentOrder(
      body.orderType,
      body.productIds,
      body.categoryIds,
      body.restaurantId
    );
  }

}