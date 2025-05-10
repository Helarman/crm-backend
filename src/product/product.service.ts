import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { ProductDto } from './dto/product.dto'

@Injectable()
export class ProductService {
	constructor(private prisma: PrismaService) {}

	async getAll(searchTerm?: string) {
		if (searchTerm) return this.getSearchTermFilter(searchTerm)

		return this.prisma.product.findMany({
			orderBy: {
				createdAt: 'desc'
			},
			include: {
			  restaurants: true, 
			  category: true,  
			  additives: true 
			}
		})
	}

	private async getSearchTermFilter(searchTerm: string) {
		return this.prisma.product.findMany({
			where: {
				OR: [
					{
						title: {
							contains: searchTerm,
							mode: 'insensitive'
						}
					},
					{
						description: {
							contains: searchTerm,
							mode: 'insensitive'
						}
					}
				]
			}
		})
	}

	/*async getByStoreId(storeId: string) {
		return this.prisma.product.findMany({
			where: {
				storeId
			}
		})
	}*/

	async getById(id: string) {
		const product = await this.prisma.product.findUnique({
			where: {
				id
			}
		})

		if (!product) throw new NotFoundException('Товар не найден')

		return product
	}


	async create(dto: ProductDto) {
		return this.prisma.product.create({
			data: {
				title: dto.title,
				description: dto.description,
				price: dto.price,
				images: dto.images,
				categoryId: dto.categoryId,
				ingredients: dto.ingredients
			}
		})
	}

	async update(id: string, dto: ProductDto) {
		await this.getById(id)

		return this.prisma.product.update({
			where: { id },
			data: dto
		})
	}

	async delete(id: string) {
		await this.getById(id)

		return this.prisma.product.delete({
			where: { id }
		})
	}
}
