import { Module } from '@nestjs/common'

import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { CategoryModule } from './category/category.module'
import { OrderModule } from './order/order.module';
import { RestaurantModule } from './restaurant/restaurant.module'
import { UserModule } from './user/user.module'
import { ProductModule } from './product/product.module';
import { ShiftModule } from './shift/shift.module'
import { CustomerModule } from './customer/customer.module';
import { AdditiveModule } from './additive/additive.module';
import { WorkshopModule } from './workshop/workshop.module';
import { PaymentsModule } from './payment/payment.module';
import { DeliveryZoneModule } from './delivery-zone/delivery-zone.module';
import { WarehouseModule } from './warehouse/warehouse.module';
import { SurchargeModule } from './surcharge/surcharge.module';
import { DiscountsModule } from './discounts/discounts.module';
import { NetworkModule } from './network/network.module';
import { TenantModule } from './tenant/tenant.module';
import { OrderLogModule } from './order-log/order-log.module';
import { DictionariesModule } from './dictionaries/dictionaries.module';
import { MigrationModule } from './migration/migration.module';
import { ScheduleModule } from '@nestjs/schedule'
import { PaymentIntegrationModule } from './payment-integration/payment-integration.module';
import { OrderAdditiveModule } from './order-additive/order-additive.module';
import { TablesModule } from './tables/tables.module';
import { ReservationsModule } from './reservation/reservations.module';
import { OrderTableModule } from './order-tables/order-tables.module';

@Module({
	imports: [
		ConfigModule.forRoot(),
		ScheduleModule.forRoot(),
		AuthModule,
		MigrationModule,
		UserModule,
		CategoryModule,
		RestaurantModule,
		WorkshopModule,
		OrderModule,
		ProductModule,
		ShiftModule,
		AdditiveModule,
		PaymentsModule,
		DeliveryZoneModule,
		CustomerModule,
		WarehouseModule,
		SurchargeModule,
		DiscountsModule,
		NetworkModule,
		TenantModule,
		OrderAdditiveModule,
		DictionariesModule,
		OrderLogModule,
		PaymentIntegrationModule,
		TablesModule,
		ReservationsModule,
		OrderTableModule

	]
})
export class AppModule {}
