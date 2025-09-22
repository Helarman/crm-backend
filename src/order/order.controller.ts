import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  ParseArrayPipe,
  ParseBoolPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponse } from './dto/order-response.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderItemStatusDto } from './dto/update-order-item-status.dto';
import { BulkUpdateOrderItemsStatusDto } from './dto/bulk-update-order-items-status.dto';
import { AddItemToOrderDto } from './dto/add-item-to-order.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateAttentionFlagsDto } from './dto/update-attention-flags.dto';
import { PaginatedResponse } from './dto/paginated-response.dto';
import { EnumOrderStatus } from '@prisma/client';
import { UpdateOrderItemQuantityDto } from './dto/update-order-item-quantity.dto';
import { PartialRefundOrderItemDto } from './dto/partial-refund-item.dto';

@ApiTags('Заказы')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Создать новый заказ' })
  @ApiResponse({ status: 201, description: 'Заказ создан', type: OrderResponse })
  async createOrder(@Body() dto: CreateOrderDto): Promise<OrderResponse> {
    return this.orderService.createOrder(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить информацию о заказе' })
  @ApiResponse({ status: 200, description: 'Информация о заказе', type: OrderResponse })
  async getOrder(@Param('id') id: string): Promise<OrderResponse> {
    return this.orderService.findById(id);
  }

  @Get('restaurant/:restaurantId')
  @ApiOperation({ summary: 'Получить заказы по ресторану' })
  @ApiResponse({ 
    status: 200, 
    description: 'Список заказов ресторана', 
    type: [OrderResponse] 
  })
  async getOrdersByRestaurant(
    @Param('restaurantId') restaurantId: string
  ): Promise<OrderResponse[]> {
    return this.orderService.findByRestaurantId(restaurantId);
  }

  @Get('restaurant/:restaurantId/active')
  @ApiOperation({ summary: 'Получить активные заказы ресторана (за последние 2 дня)' })
  @ApiResponse({
    status: 200,
    description: 'Список активных заказов',
    type: [OrderResponse],
  })
  async getActiveRestaurantOrders(
    @Param('restaurantId') restaurantId: string,
  ): Promise<OrderResponse[]> {
    return this.orderService.getActiveRestaurantOrders(restaurantId);
  }

  @Get('restaurant/:restaurantId/archive')
  @ApiOperation({
    summary: 'Получить архив заказов ресторана с пагинацией и фильтрами',
  })
  @ApiResponse({
    status: 200,
    description: 'Пагинированный список заказов',
    type: PaginatedResponse<OrderResponse>,
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'isReordered', required: false, type: Boolean })
  @ApiQuery({ name: 'hasDiscount', required: false, type: Boolean })
  @ApiQuery({ name: 'discountCanceled', required: false, type: Boolean })
  @ApiQuery({ name: 'isRefund', required: false, type: Boolean })
  @ApiQuery({
    name: 'status',
    required: false,
    type: [String],
    enum: EnumOrderStatus,
  })
  @ApiQuery({ name: 'searchQuery', required: false, type: String })
  async getRestaurantArchive(
    @Param('restaurantId') restaurantId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('isReordered', new ParseBoolPipe({ optional: true })) isReordered?: boolean,
    @Query('hasDiscount', new ParseBoolPipe({ optional: true })) hasDiscount?: boolean,
    @Query('discountCanceled', new ParseBoolPipe({ optional: true })) discountCanceled?: boolean,
    @Query('isRefund', new ParseBoolPipe({ optional: true })) isRefund?: boolean,
    @Query(
      'status',
      new ParseArrayPipe({ optional: true, items: String }),
    ) status?: EnumOrderStatus[],
    @Query('searchQuery') searchQuery?: string,
  ): Promise<PaginatedResponse<OrderResponse>> {
    return this.orderService.getRestaurantArchive(
      restaurantId,
      page,
      limit,
      {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        isReordered,
        hasDiscount,
        discountCanceled,
        isRefund,
        status,
        searchQuery,
      },
    );
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Обновить статус заказа' })
  @ApiResponse({ 
    status: 200, 
    description: 'Статус заказа обновлен', 
    type: OrderResponse 
  })
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto
  ): Promise<OrderResponse> {
    return this.orderService.updateStatus(id, dto);
  }

  @Patch(':orderId/items/:itemId/status')
  @ApiOperation({ summary: 'Обновить статус элемента заказа' })
  @ApiResponse({ 
    status: 200, 
    description: 'Статус элемента заказа обновлен', 
    type: OrderResponse 
  })
  async updateOrderItemStatus(
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateOrderItemStatusDto
  ): Promise<OrderResponse> {
    return this.orderService.updateOrderItemStatus(orderId, itemId, dto);
  }

  @Patch(':id/items/status')
  @ApiOperation({ summary: 'Массовое обновление статусов элементов заказа' })
  @ApiResponse({ 
    status: 200, 
    description: 'Статусы элементов обновлены', 
    type: OrderResponse 
  })
  async bulkUpdateOrderItemsStatus(
    @Param('id') orderId: string,
    @Body() dto: BulkUpdateOrderItemsStatusDto
  ): Promise<OrderResponse> {
    return this.orderService.bulkUpdateOrderItemsStatus(orderId, dto);
  }

  @Post(':orderId/items')
  @ApiOperation({ summary: 'Добавить позицию в заказ' })
  @ApiResponse({ 
    status: 201, 
    description: 'Позиция добавлена в заказ', 
    type: OrderResponse 
  })
  async addItemToOrder(
    @Param('orderId') orderId: string,
    @Body() dto: AddItemToOrderDto
  ): Promise<OrderResponse> {
    return this.orderService.addItemToOrder(orderId, dto);
  }

  @Patch(':orderId/items/:itemId')
  @ApiOperation({ summary: 'Обновить позицию в заказе' })
  @ApiResponse({ 
    status: 200, 
    description: 'Позиция обновлена', 
    type: OrderResponse 
  })
  async updateOrderItem(
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateOrderItemDto
  ): Promise<OrderResponse> {
    return this.orderService.updateOrderItem(orderId, itemId, dto);
  }

  @Delete(':orderId/items/:itemId')
  @ApiOperation({ summary: 'Удалить позицию из заказа' })
  @ApiResponse({ 
    status: 200, 
    description: 'Позиция удалена из заказа', 
    type: OrderResponse 
  })
  async removeItemFromOrder(
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string
  ): Promise<OrderResponse> {
    return this.orderService.removeItemFromOrder(orderId, itemId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить информацию о заказе' })
  @ApiResponse({ 
    status: 200, 
    description: 'Информация о заказе обновлена', 
    type: OrderResponse 
  })
  async updateOrder(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto
  ): Promise<OrderResponse> {
    return this.orderService.updateOrder(id, dto);
  }

  @Patch(':id/attention-flags')
  @ApiOperation({ summary: 'Обновить флаги внимания заказа' })
  @ApiResponse({ 
    status: 200, 
    description: 'Флаги внимания обновлены', 
    type: OrderResponse 
  })
  async updateAttentionFlags(
    @Param('id') id: string,
    @Body() dto: UpdateAttentionFlagsDto
  ): Promise<OrderResponse> {
    return this.orderService.updateAttentionFlags(id, dto);
  }

  @Post(':orderId/items/:itemId/refund')
  @ApiOperation({ summary: 'Вернуть блюдо в заказе' })
  @ApiResponse({ 
    status: 200, 
    description: 'Блюдо возвращено', 
    type: OrderResponse 
  })
async refundItem(
  @Param('orderId') orderId: string,
  @Param('itemId') itemId: string,
  @Body() dto: { reason: string; userId?: string },
) {
  const userId = dto.userId
  return this.orderService.refundOrderItem(orderId, itemId, dto.reason, userId);
}

  @Patch(':id/customer')
  @ApiOperation({ summary: 'Привязать клиента к заказу' })
  @ApiResponse({ 
    status: 200, 
    description: 'Клиент привязан к заказу', 
    type: OrderResponse 
  })
  async applyCustomerToOrder(
    @Param('id') id: string,
    @Body() body: { customerId: string }
  ): Promise<OrderResponse> {
    return this.orderService.applyCustomerToOrder(id, body.customerId);
  }

  @Post(':id/apply-discount')
  @ApiOperation({ summary: 'Применить скидку клиента к заказу' })
  @ApiResponse({ 
    status: 200, 
    description: 'Скидка применена', 
    type: OrderResponse 
  })
  async applyCustomerDiscount(
    @Param('id') id: string,
    @Body() body: { discountId: string }
  ): Promise<OrderResponse> {
    return this.orderService.applyCustomerDiscount(id, body.discountId);
  }

  @Post(':id/apply-customer-discount')
  @ApiOperation({ summary: 'Применить персональную скидку клиента' })
  async applyCustomerPersonalDiscount(
    @Param('id') id: string
  ): Promise<OrderResponse> {
    return this.orderService.applyCustomerPersonalDiscount(id);
  }
  

  @Post(':id/apply-points')
  @ApiOperation({ summary: 'Применить бонусные баллы клиента к заказу' })
  @ApiResponse({ 
    status: 200, 
    description: 'Бонусные баллы применены', 
    type: OrderResponse 
  })
  async applyCustomerPoints(
    @Param('id') id: string,
    @Body() body: { points: number }
  ): Promise<OrderResponse> {
    return this.orderService.applyCustomerPoints(id, body.points);
  }

  @Delete(':id/remove-points')
  @ApiOperation({ summary: 'Удалить бонусные баллы из заказа' })
  @ApiResponse({ 
    status: 200, 
    description: 'Бонусные баллы удалены', 
    type: OrderResponse 
  })
  async removeCustomerPoints(
    @Param('id') id: string
  ): Promise<OrderResponse> {
    return this.orderService.removeCustomerPoints(id);
  }

  @Delete(':id/customer')
  @ApiOperation({ summary: 'Отвязать клиента от заказа' })
  @ApiResponse({ 
    status: 200, 
    description: 'Клиент отвязан от заказа', 
    type: OrderResponse 
  })
  async removeCustomerFromOrder(
    @Param('id') id: string
  ): Promise<OrderResponse> {
    return this.orderService.removeCustomerFromOrder(id);
  }

  @Delete(':id/discount')
  @ApiOperation({ summary: 'Удалить скидку из заказа' })
  @ApiResponse({ 
    status: 200, 
    description: 'Скидка удалена', 
    type: OrderResponse 
  })
  async removeCustomerDiscount(
    @Param('id') id: string
  ): Promise<OrderResponse> {
    return this.orderService.removeCustomerDiscount(id);
  }

  @Post('apply-to-order/:orderId/:discountId')
  @ApiOperation({ summary: 'Применить скидку к заказу' })
  async applyDiscountToOrder(
    @Param('orderId') orderId: string,
     @Param('discountId') discountId: string,
  ): Promise<OrderResponse> {
    return this.orderService.applyDiscountToOrder(orderId, discountId);
  }

  @Delete('remove-from-order/:orderId')
  @ApiOperation({ summary: 'Удалить скидку из заказа' })
  async removeDiscountFromOrder(
    @Param('orderId') orderId: string
  ): Promise<OrderResponse> {
    return this.orderService.removeDiscountFromOrder(orderId);
  }

  @Patch(':orderId/items/:itemId/quantity')
  async updateOrderItemQuantity(
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateOrderItemQuantityDto,
  ): Promise<OrderResponse> {
    return this.orderService.updateOrderItemQuantity(
      orderId,
      itemId,
      dto.quantity,
      dto.userId,
    );
  }

  // Эндпоинт для частичного возврата позиции
  @Post(':orderId/items/:itemId/partial-refund')
  async partialRefundOrderItem(
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body() dto: PartialRefundOrderItemDto,
  ): Promise<OrderResponse> {
    return this.orderService.partialRefundOrderItem(
      orderId,
      itemId,
      dto.quantity,
      dto.reason,
      dto.userId,
    );
  }
  
}