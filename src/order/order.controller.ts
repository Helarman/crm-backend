import { Body, Controller, Get, Param, Post, UseGuards, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponse } from './dto/order-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderItemStatusDto } from './dto/update-order-item-status.dto';
import { BulkUpdateOrderItemsStatusDto } from './dto/bulk-update-order-items-status.dto';
import { AddItemToOrderDto } from './dto/add-item-to-order.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';

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
  
  @Patch(':id/status')
  @ApiOperation({ summary: 'Обновить статус заказа' })
  @ApiResponse({ 
    status: 200, 
    description: 'Статус заказа обновлен', 
    type: OrderResponse 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Некорректный переход статусов' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Заказ не найден' 
  })
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto
  ): Promise<OrderResponse> {
    return this.orderService.updateStatus(id, dto);
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
}