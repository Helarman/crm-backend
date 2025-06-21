import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Param, 
  UseGuards 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody, 
  ApiParam,
  ApiBearerAuth 
} from '@nestjs/swagger';
import { OrderLogService } from './order-log.service';
import { CreateOrderLogDto } from './dto/create-order-log.dto';
import { OrderLogResponseDto } from './dto/order-log-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Order Logs')
@Controller('order-logs')
export class OrderLogController {
  constructor(private readonly orderLogService: OrderLogService) {}

  @Post()
  @ApiOperation({ summary: 'Создать запись лога для заказа' })
  @ApiBody({ type: CreateOrderLogDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Лог создан',
    type: OrderLogResponseDto 
  })
  async create(@Body() createOrderLogDto: CreateOrderLogDto) {
    return this.orderLogService.createLog(createOrderLogDto);
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Получить логи для заказа' })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiResponse({ 
    status: 200, 
    description: 'Список логов',
    type: [OrderLogResponseDto] 
  })
  async findByOrder(@Param('orderId') orderId: string) {
    return this.orderLogService.getLogsByOrder(orderId);
  }
}