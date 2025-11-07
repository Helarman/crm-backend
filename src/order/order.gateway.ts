import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/orders',
})
@Injectable()
export class OrderGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(OrderGateway.name);

  @WebSocketServer()
  server: Server;

  // Храним подключения по ресторанам и заказам
  private restaurantRooms = new Map<string, Set<string>>();
  private orderRooms = new Map<string, Set<string>>();

  constructor() {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway для заказов инициализирован');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Клиент подключен: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Клиент отключен: ${client.id}`);
    
    // Удаляем клиента из всех комнат при отключении
    this.removeClientFromAllRooms(client);
  }

  // Подписка на обновления ресторана
  @SubscribeMessage('subscribe:restaurant')
  handleSubscribeToRestaurant(client: Socket, restaurantId: string) {
    const roomName = `restaurant:${restaurantId}`;
    client.join(roomName);
    
    if (!this.restaurantRooms.has(roomName)) {
      this.restaurantRooms.set(roomName, new Set());
    }
    this.restaurantRooms.get(roomName).add(client.id);
    
    this.logger.log(`Клиент ${client.id} подписался на ресторан ${restaurantId}`);
    client.emit('subscribed', { room: roomName });
  }

  // Подписка на обновления конкретного заказа
  @SubscribeMessage('subscribe:order')
  handleSubscribeToOrder(client: Socket, orderId: string) {
    const roomName = `order:${orderId}`;
    client.join(roomName);
    
    if (!this.orderRooms.has(roomName)) {
      this.orderRooms.set(roomName, new Set());
    }
    this.orderRooms.get(roomName).add(client.id);
    
    this.logger.log(`Клиент ${client.id} подписался на заказ ${orderId}`);
    client.emit('subscribed', { room: roomName });
  }

  // Отписка от ресторана
  @SubscribeMessage('unsubscribe:restaurant')
  handleUnsubscribeFromRestaurant(client: Socket, restaurantId: string) {
    const roomName = `restaurant:${restaurantId}`;
    client.leave(roomName);
    this.restaurantRooms.get(roomName)?.delete(client.id);
  }

  // Отписка от заказа
  @SubscribeMessage('unsubscribe:order')
  handleUnsubscribeFromOrder(client: Socket, orderId: string) {
    const roomName = `order:${orderId}`;
    client.leave(roomName);
    this.orderRooms.get(roomName)?.delete(client.id);
  }

  // Методы для отправки событий из сервисов

  // Новый заказ создан
  async notifyNewOrder(order: any) {
    const restaurantRoom = `restaurant:${order.restaurantId}`;
    this.server.to(restaurantRoom).emit('order:created', {
      type: 'ORDER_CREATED',
      data: order,
      timestamp: new Date(),
    });
    
    this.logger.log(`Уведомление о новом заказе отправлено в комнату ${restaurantRoom}`);
  }

  // Статус заказа обновлен
  async notifyOrderStatusUpdated(order: any) {
    const restaurantRoom = `restaurant:${order.restaurantId}`;
    const orderRoom = `order:${order.id}`;

    // Отправляем в комнату ресторана (для списков)
    this.server.to(restaurantRoom).emit('order:updated', {
      type: 'ORDER_STATUS_UPDATED',
      data: order,
      timestamp: new Date(),
    });

    // Отправляем в комнату заказа (для страницы заказа)
    this.server.to(orderRoom).emit('order:status_updated', {
      type: 'STATUS_UPDATED',
      data: order,
      timestamp: new Date(),
    });

    this.logger.log(`Статус заказа ${order.id} обновлен`);
  }

  // Статус элемента заказа обновлен
  async notifyOrderItemStatusUpdated(order: any, itemId: string) {
    const restaurantRoom = `restaurant:${order.restaurantId}`;
    const orderRoom = `order:${order.id}`;

    this.server.to(restaurantRoom).emit('order:item_updated', {
      type: 'ORDER_ITEM_UPDATED',
      data: { order, itemId },
      timestamp: new Date(),
    });

    this.server.to(orderRoom).emit('order:item_status_updated', {
      type: 'ITEM_STATUS_UPDATED',
      data: { order, itemId },
      timestamp: new Date(),
    });

    this.logger.log(`Статус элемента ${itemId} заказа ${order.id} обновлен`);
  }

  // Заказ изменен (добавлены/удалены позиции и т.д.)
  async notifyOrderModified(order: any) {
    const restaurantRoom = `restaurant:${order.restaurantId}`;
    const orderRoom = `order:${order.id}`;

    this.server.to(restaurantRoom).emit('order:modified', {
      type: 'ORDER_MODIFIED',
      data: order,
      timestamp: new Date(),
    });

    this.server.to(orderRoom).emit('order:details_updated', {
      type: 'DETAILS_UPDATED',
      data: order,
      timestamp: new Date(),
    });
  }

  private removeClientFromAllRooms(client: Socket) {
    // Удаляем из комнат ресторанов
    this.restaurantRooms.forEach((clients, roomName) => {
      if (clients.has(client.id)) {
        clients.delete(client.id);
        this.logger.log(`Клиент ${client.id} удален из комнаты ${roomName}`);
      }
    });

    // Удаляем из комнат заказов
    this.orderRooms.forEach((clients, roomName) => {
      if (clients.has(client.id)) {
        clients.delete(client.id);
        this.logger.log(`Клиент ${client.id} удален из комнаты ${roomName}`);
      }
    });
  }
}