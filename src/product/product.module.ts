import { Module } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { ProductController } from './product.controller'
import { ProductService } from './product.service'
import { AdditiveService } from 'src/additive/additive.service'
import { ProductOrderController } from './product-order.controller'

@Module({
	controllers: [ProductController, ProductOrderController],
	providers: [ProductService, PrismaService, AdditiveService]
})
export class ProductModule {}
