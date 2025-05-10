import { Module } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { RestaurantController } from './restaurant.controller';
import { PrismaService } from '../prisma.service';
//import { YandexEdaModule } from '../yandex-eda/yandex-eda.module'; // Добавьте этот импорт

@Module({
  //imports: [YandexEdaModule], // Добавьте модуль в imports
  controllers: [RestaurantController],
  providers: [RestaurantService, PrismaService],
})
export class RestaurantModule {}
