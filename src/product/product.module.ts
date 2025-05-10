import { Module } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { ProductController } from './product.controller'
import { ProductService } from './product.service'
import { AdditiveService } from 'src/additive/additive.service'

@Module({
	controllers: [ProductController],
	providers: [ProductService, PrismaService, AdditiveService]
})
export class ProductModule {}
