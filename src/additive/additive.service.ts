import { Injectable, NotFoundException,BadRequestException, Logger} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateAdditiveDto } from './dto/create-additive.dto';
import { UpdateAdditiveDto } from './dto/update-additive.dto';
import { AdditiveWithProducts } from './interfaces/additive.interface';
import { UpdateProductAdditivesDto } from './dto/update-product-additives.dto'

@Injectable()
export class AdditiveService {
    private readonly logger = new Logger(AdditiveService.name);

  constructor(private prisma: PrismaService) {}

  async create(createAdditiveDto: CreateAdditiveDto): Promise<AdditiveWithProducts> {
    return this.prisma.additive.create({
      data: createAdditiveDto,
    });
  }

  async findAll(): Promise<AdditiveWithProducts[]> {
    return this.prisma.additive.findMany({
      include: { products: true },
    });
  }

  async findOne(id: string): Promise<AdditiveWithProducts | null> {
    return this.prisma.additive.findUnique({
      where: { id },
      include: { products: true },
    });
  }

  async update(
    id: string,
    updateAdditiveDto: UpdateAdditiveDto,
  ): Promise<AdditiveWithProducts> {
    return this.prisma.additive.update({
      where: { id },
      data: updateAdditiveDto,
      include: { products: true },
    });
  }

  async remove(id: string): Promise<AdditiveWithProducts> {
    return this.prisma.additive.delete({
      where: { id },
      include: { products: true },
    });
  }

  async addToProduct(additiveId: string, productId: string): Promise<AdditiveWithProducts> {
    return this.prisma.additive.update({
      where: { id: additiveId },
      data: {
        products: {
          connect: { id: productId },
        },
      },
      include: { products: true },
    });
  }

  async removeFromProduct(additiveId: string, productId: string): Promise<AdditiveWithProducts> {
    return this.prisma.additive.update({
      where: { id: additiveId },
      data: {
        products: {
          disconnect: { id: productId },
        },
      },
      include: { products: true },
    });
  }

  async getProductAdditives(productId: string) {
    return this.prisma.product.findUnique({
      where: { id: productId },
      include: { additives: true }
    }).then(product => product?.additives || []);
  }
  
  async updateProductAdditives(
    productId: string,
    additiveIds: string[],
  ): Promise<AdditiveWithProducts[]> {
    // First verify the product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
  
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
  
    // Verify all additives exist
    const existingAdditives = await this.prisma.additive.findMany({
      where: { id: { in: additiveIds } },
    });
  
    if (existingAdditives.length !== additiveIds.length) {
      const foundIds = existingAdditives.map(a => a.id);
      const missingIds = additiveIds.filter(id => !foundIds.includes(id));
      throw new BadRequestException(`Some additives not found: ${missingIds.join(', ')}`);
    }
  
    // Update the product's additives
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        additives: {
          set: additiveIds.map(id => ({ id })),
        },
      },
    });
  
    // Return the updated list of additives for this product
    return this.getProductAdditives(productId);
  }
}