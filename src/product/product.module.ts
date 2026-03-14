import { Module } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { ProductController } from './product.controller'
import { ProductService } from './product.service'
import { AdditiveService } from 'src/additive/additive.service'
import { ProductOrderController } from './product-order.controller'
import { ComboController } from './combo.controller'
import { ComboService } from './combo.service' 

@Module({
	controllers: [
		ProductController, 
		ProductOrderController,
		ComboController 
	],
	providers: [
		ProductService, 
		PrismaService, 
		AdditiveService,
		ComboService 
	]
})
export class ProductModule {}