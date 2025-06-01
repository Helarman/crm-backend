import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  ParseUUIDPipe,
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

}