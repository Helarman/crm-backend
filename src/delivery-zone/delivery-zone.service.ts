import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';
import { DeliveryZoneEntity } from './entities/delivery-zone.entity';

@Injectable()
export class DeliveryZoneService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateDeliveryZoneDto): Promise<DeliveryZoneEntity> {
    const restaurantExists = await this.prisma.restaurant.findUnique({
      where: { id: createDto.restaurantId }
    });

    if (!restaurantExists) {
      throw new NotFoundException('Restaurant not found');
    }

    if (!createDto.polygon) {
      throw new Error('Polygon is required');
    }

    try {
      // Если используете PostGIS, создаем геометрию правильно
      const zone = await this.prisma.$queryRaw<DeliveryZoneEntity[]>`
        INSERT INTO delivery_zones (title, price, min_order, polygon, restaurant_id)
        VALUES (
          ${createDto.title},
          ${createDto.price},
          ${createDto.minOrder},
          ST_GeomFromText(${createDto.polygon}, 4326),
          ${createDto.restaurantId}
        )
        RETURNING 
          id,
          title,
          price,
          min_order as "minOrder",
          restaurant_id as "restaurantId",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      return new DeliveryZoneEntity(zone[0]);
    } catch (error) {
      console.error('Failed to create delivery zone:', error);
      throw new Error('Failed to create delivery zone');
    }
  }

  async findAllByRestaurant(restaurantId: string): Promise<DeliveryZoneEntity[]> {
    await this.validateRestaurantExists(restaurantId);

    try {
      const zones = await this.prisma.$queryRaw<DeliveryZoneEntity[]>`
        SELECT 
          id,
          title,
          price,
          min_order as "minOrder",
          restaurant_id as "restaurantId",
          created_at as "createdAt",
          updated_at as "updatedAt",
          ST_AsText(polygon) as polygon  // Используем ST_AsText вместо ST_AsGeoJSON
        FROM delivery_zones
        WHERE restaurant_id = ${restaurantId}
        ORDER BY created_at DESC
      `;

      return zones.map(zone => new DeliveryZoneEntity(zone));
    } catch (error) {
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
          ST_AsText(polygon) as polygon  // Используем ST_AsText
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
    await this.findOne(id);

    try {
      // Динамическое построение запроса обновления
      const updateFields = [];
      const values = { id };

      if (updateDto.title !== undefined) {
        updateFields.push('title = ${title}');
        values['title'] = updateDto.title;
      }
      
      if (updateDto.price !== undefined) {
        updateFields.push('price = ${price}');
        values['price'] = updateDto.price;
      }
      
      if (updateDto.minOrder !== undefined) {
        updateFields.push('min_order = ${minOrder}');
        values['minOrder'] = updateDto.minOrder;
      }
      
      if (updateDto.polygon !== undefined) {
        updateFields.push('polygon = ST_GeomFromText(${polygon}, 4326)');
        values['polygon'] = updateDto.polygon;
      }

      updateFields.push('updated_at = NOW()');

      if (updateFields.length === 0) {
        return await this.findOne(id);
      }

      const updateQuery = `
        UPDATE delivery_zones
        SET ${updateFields.join(', ')}
        WHERE id = ${id}
        RETURNING 
          id,
          title,
          price,
          min_order as "minOrder",
          restaurant_id as "restaurantId",
          created_at as "createdAt",
          updated_at as "updatedAt",
          ST_AsText(polygon) as polygon
      `;

      const [updatedZone] = await this.prisma.$queryRawUnsafe<DeliveryZoneEntity[]>(
        updateQuery,
        values
      );

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

      const [zone] = await this.prisma.$queryRaw<DeliveryZoneEntity[]>`
        SELECT 
          id,
          title,
          price,
          min_order as "minOrder",
          restaurant_id as "restaurantId",
          created_at as "createdAt",
          updated_at as "updatedAt",
          ST_AsText(polygon) as polygon
        FROM delivery_zones
        WHERE 
          restaurant_id = ${restaurantId} AND
          ST_Contains(polygon, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
        LIMIT 1
      `;

      return zone ? new DeliveryZoneEntity(zone) : null;
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