import { Module } from '@nestjs/common'

import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { CategoryModule } from './category/category.module'
import { OrderModule } from './order/order.module';
import { RestaurantModule } from './restaurant/restaurant.module'
import { UserModule } from './user/user.module'
import { ProductModule } from './product/product.module';
import { ShiftModule } from './shift/shift.module'
import { CustomerVerificationModule } from './customer-verification/customer-verification.module';
import { DiscountModule } from './discount/discount.module'; 
import { MarkupModule } from './markup/markup.module'; 
import { AdditiveModule } from './additive/additive.module';
import { WorkshopModule } from './workshop/workshop.module';

@Module({
	imports: [
		ConfigModule.forRoot(),
		AuthModule,
		UserModule,
		CategoryModule,
		RestaurantModule,
		WorkshopModule,
		OrderModule,
		ProductModule,
		ShiftModule,
		AdditiveModule,
		
		CustomerVerificationModule,
		DiscountModule, MarkupModule
	]
})
export class AppModule {}
