import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';
import { DeliveryZoneEntity } from './entities/delivery-zone.entity';

@Injectable()
export class DeliveryZoneService {
  constructor(private readonly prisma: PrismaService) {}

   async create(createDto: CreateDeliveryZoneDto): Promise<DeliveryZoneEntity> {
    // Проверка существования ресторана
    const restaurantExists = await this.prisma.restaurant.findUnique({
      where: { id: createDto.restaurantId }
    });

    if (!restaurantExists) {
      throw new NotFoundException('Restaurant not found');
    }

    // Валидация полигона
    if (!createDto.polygon) {
      throw new Error('Polygon is required');
    }

    try {
      const zone = await this.prisma.deliveryZone.create({
        data: {
          title: createDto.title,
          price: createDto.price,
          minOrder: createDto.minOrder,
          polygon: createDto.polygon, // Храним как WKT-строку
          restaurantId: createDto.restaurantId
        }
      });

      return new DeliveryZoneEntity(zone);
    } catch (error) {
      console.error('Failed to create delivery zone:', error);
      throw new Error('Failed to create delivery zone');
    }
  }

  
 async findAllByRestaurant(restaurantId: string): Promise<DeliveryZoneEntity[]> {
  await this.validateRestaurantExists(restaurantId);

  try {
    // Сначала проверяем доступность PostGIS функций
    await this.prisma.$queryRaw`SELECT PostGIS_version()`;

    const zones = await this.prisma.$queryRaw<DeliveryZoneEntity[]>`
      SELECT 
        id,
        title,
        price,
        min_order as "minOrder",
        restaurant_id as "restaurantId",
        created_at as "createdAt",
        updated_at as "updatedAt",
        ST_AsGeoJSON(ST_GeomFromText(polygon)) as polygon
      FROM delivery_zones
      WHERE restaurant_id = ${restaurantId}
      ORDER BY created_at DESC
    `;

    return zones.map(zone => new DeliveryZoneEntity(zone));
  } catch (error) {
    if (error.message.includes('function st_geomfromtext')) {
      throw new Error('PostGIS extension not properly installed or polygon data is malformed');
    }
    this.handleDatabaseError(error, 'Failed to fetch delivery zones');
  }
}

  async findOne(id: string): Promise<DeliveryZoneEntity> {
    try {
      const [zone] = await this.prisma.$queryRaw<DeliveryZoneEntity[]>`
        SELECT 
          id,
          title,
          price,
          min_order as "minOrder",
          restaurant_id as "restaurantId",
          created_at as "createdAt",
          updated_at as "updatedAt",
          ST_AsGeoJSON(polygon) as polygon
        FROM delivery_zones
        WHERE id = ${id}
        LIMIT 1
      `;

      if (!zone) {
        throw new NotFoundException(`Delivery zone with ID ${id} not found`);
      }

      return new DeliveryZoneEntity(zone);
    } catch (error) {
      this.handleDatabaseError(error, 'Failed to fetch delivery zone');
    }
  }

  async update(
    id: string,
    updateDto: UpdateDeliveryZoneDto,
  ): Promise<DeliveryZoneEntity> {
    await this.findOne(id); // Проверяем существование зоны

    try {
      const [updatedZone] = await this.prisma.$queryRaw<DeliveryZoneEntity[]>`
        UPDATE delivery_zones
        SET 
          title = ${updateDto.title ?? null},
          price = ${updateDto.price ?? null},
          min_order = ${updateDto.minOrder ?? null},
          ${updateDto.polygon ? 
            this.prisma.$queryRaw`polygon = ST_GeomFromText(${updateDto.polygon}, 4326),` : 
            this.prisma.$queryRaw``
          }
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING 
          id,
          title,
          price,
          min_order as "minOrder",
          restaurant_id as "restaurantId",
          created_at as "createdAt",
          updated_at as "updatedAt",
          ST_AsGeoJSON(polygon) as polygon
      `;

      return new DeliveryZoneEntity(updatedZone);
    } catch (error) {
      this.handleDatabaseError(error, 'Failed to update delivery zone');
    }
  }

  async remove(id: string): Promise<DeliveryZoneEntity> {
    const zone = await this.findOne(id);
    
    try {
      await this.prisma.$queryRaw`
        DELETE FROM delivery_zones
        WHERE id = ${id}
      `;

      return zone;
    } catch (error) {
      this.handleDatabaseError(error, 'Failed to delete delivery zone');
    }
  }

async findZoneForPoint(
    restaurantId: string,
    lat: number,
    lng: number,
  ): Promise<DeliveryZoneEntity | null> {
    try {
      if (!this.isValidCoordinate(lat, lng)) {
        throw new Error('Invalid coordinates');
      }

      const pointWkt = `POINT(${lng} ${lat})`;
      
      const [zone] = await this.prisma.$queryRaw<DeliveryZoneEntity[]>`
        SELECT 
          id,
          title,
          price,
          min_order as "minOrder",
          restaurant_id as "restaurantId",
          created_at as "createdAt",
          updated_at as "updatedAt",
          ST_AsGeoJSON(polygon) as polygon
        FROM delivery_zones
        WHERE 
          restaurant_id = ${restaurantId} AND
          ST_Contains(ST_GeomFromText(polygon::text, 4326), ST_GeomFromText(${pointWkt}, 4326))
        LIMIT 1
      `;

      return new DeliveryZoneEntity(zone);
    } catch (error) {
      console.error('Error checking zone coverage:', error);
      throw new Error('Failed to check zone coverage');
    }
  }

  private isValidCoordinate(lat: number, lng: number): boolean {
    return (
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  private async validateRestaurantExists(restaurantId: string): Promise<void> {
    const count = await this.prisma.restaurant.count({
      where: { id: restaurantId },
    });

    if (count === 0) {
      throw new NotFoundException('Restaurant not found');
    }
  }

  private handleDatabaseError(error: any, context: string): never {
    console.error(`${context}:`, error);
    
    if (error instanceof NotFoundException) {
      throw error;
    }

    if (error.code === 'P2025') {
      throw new NotFoundException('Resource not found');
    }

    throw new InternalServerErrorException(context);
  }
}