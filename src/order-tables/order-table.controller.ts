import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiQuery
} from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import { AssignTableDto } from './dto/assign-table.dto';
import { OrderTableService } from './order-table.service';

@ApiTags('Управление столами в заказах')
@ApiBearerAuth()
@Controller('orders')
export class OrderTableController {
  constructor(private readonly orderTableService: OrderTableService) {}

  @Post(':orderId/assign-table')
  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Auth()
  @ApiOperation({ summary: 'Привязать стол к заказу' })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiBody({ type: AssignTableDto })
  @ApiOkResponse({ description: 'Стол успешно привязан к заказу' })
  @ApiNotFoundResponse({ description: 'Заказ или стол не найден' })
  @ApiConflictResponse({ description: 'Стол уже занят или есть бронь' })
  async assignTable(
    @Param('orderId') orderId: string,
    @Body() dto: AssignTableDto,
  ) {
    return this.orderTableService.assignTableToOrder(orderId, dto);
  }

  @Delete(':orderId/unassign-table')
  @HttpCode(200)
  @Auth()
  @ApiOperation({ summary: 'Отвязать стол от заказа' })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiOkResponse({ description: 'Стол успешно отвязан от заказа' })
  @ApiNotFoundResponse({ description: 'Заказ не найден' })
  @ApiConflictResponse({ description: 'Заказ не привязан к столу' })
  async unassignTable(@Param('orderId') orderId: string) {
    return this.orderTableService.unassignTableFromOrder(orderId);
  }

  @Get(':orderId/table')
  @ApiOperation({ summary: 'Получить информацию о столе заказа' })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiOkResponse({ description: 'Информация о столе получена' })
  @ApiNotFoundResponse({ description: 'Заказ не найден' })
  async getOrderTable(@Param('orderId') orderId: string) {
    return this.orderTableService.getOrderTable(orderId);
  }

  @Get('tables/:tableId/orders')
  @ApiOperation({ summary: 'Получить заказы на столе' })
  @ApiParam({ name: 'tableId', description: 'ID стола' })
  @ApiQuery({ name: 'includeCompleted', required: false, type: Boolean })
  @ApiOkResponse({ description: 'Список заказов получен' })
  @ApiNotFoundResponse({ description: 'Стол не найден' })
  async getOrdersByTable(
    @Param('tableId') tableId: string,
    @Query('includeCompleted') includeCompleted?: boolean,
  ) {
    return this.orderTableService.getOrdersByTable(
      tableId,
      includeCompleted === true,
    );
  }

  @Get('tables/:tableId/status')
  @ApiOperation({ summary: 'Получить статус стола' })
  @ApiParam({ name: 'tableId', description: 'ID стола' })
  @ApiOkResponse({ description: 'Статус стола получен' })
  @ApiNotFoundResponse({ description: 'Стол не найден' })
  async getTableStatus(@Param('tableId') tableId: string) {
    return this.orderTableService.getTableStatus(tableId);
  }
}