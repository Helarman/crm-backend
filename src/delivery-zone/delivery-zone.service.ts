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
      const zone = await this.prisma.deliveryZone.create({
        data: {
          title: createDto.title,
          price: createDto.price,
          minOrder: createDto.minOrder,
          polygon: createDto.polygon,
          restaurantId: createDto.restaurantId,
        },
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
      const zones = await this.prisma.deliveryZone.findMany({
        where: { restaurantId },
        orderBy: { createdAt: 'desc' },
      });

      return zones.map(zone => new DeliveryZoneEntity(zone));
    } catch (error) {
      this.handleDatabaseError(error, 'Failed to fetch delivery zones');
    }
  }

  async findOne(id: string): Promise<DeliveryZoneEntity> {
    try {
      const zone = await this.prisma.deliveryZone.findUnique({
        where: { id },
      });

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
      const updatedZone = await this.prisma.deliveryZone.update({
        where: { id },
        data: {
          ...(updateDto.title !== undefined && { title: updateDto.title }),
          ...(updateDto.price !== undefined && { price: updateDto.price }),
          ...(updateDto.minOrder !== undefined && { minOrder: updateDto.minOrder }),
          ...(updateDto.polygon !== undefined && { polygon: updateDto.polygon }),
        },
      });

      return new DeliveryZoneEntity(updatedZone);
    } catch (error) {
      this.handleDatabaseError(error, 'Failed to update delivery zone');
    }
  }

  async remove(id: string): Promise<DeliveryZoneEntity> {
    const zone = await this.findOne(id);
    
    try {
      await this.prisma.deliveryZone.delete({
        where: { id }
      });

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
    console.log('Searching zone for:', { restaurantId, lat, lng })
    
    if (!this.isValidCoordinate(lat, lng)) {
      throw new Error('Invalid coordinates')
    }

    const zones = await this.prisma.deliveryZone.findMany({
      where: { restaurantId },
    });

    console.log('Found zones:', zones.length)

    for (const zone of zones) {
      console.log('Checking zone:', zone.title, zone.price)
      if (this.isPointInPolygon(lng, lat, zone.polygon)) {
        console.log('Zone found:', zone)
        return new DeliveryZoneEntity(zone);
      }
    }
    
    console.log('No zone found for point')
    return null;
  } catch (error) {
    console.error('Error checking zone coverage:', error);
    throw new Error('Failed to check zone coverage');
  }
}

  private isPointInPolygon(lng: number, lat: number, polygonWkt: string): boolean {
    try {
      const match = polygonWkt.match(/POLYGON\s*\(\s*\(\s*(.+?)\s*\)\s*\)/i);
      if (!match) {
        console.warn('Invalid polygon format:', polygonWkt);
        return false;
      }

      const coordsStr = match[1];
      const coordPairs = coordsStr.split(',').map(coord => 
        coord.trim().split(/\s+/).map(Number)
      );
      
      const polygon = coordPairs.map(coord => ({
        lng: coord[0],
        lat: coord[1]
      }));

      const firstPoint = polygon[0];
      const lastPoint = polygon[polygon.length - 1];
      if (firstPoint.lng !== lastPoint.lng || firstPoint.lat !== lastPoint.lat) {
        polygon.push({ lng: firstPoint.lng, lat: firstPoint.lat });
      }

      return this.pointInPolygon({ lng, lat }, polygon);
    } catch (error) {
      console.error('Error parsing polygon:', error);
      return false;
    }
  }

  private pointInPolygon(point: { lng: number; lat: number }, polygon: { lng: number; lat: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng, yi = polygon[i].lat;
      const xj = polygon[j].lng, yj = polygon[j].lat;
      
      const intersect = ((yi > point.lat) !== (yj > point.lat))
          && (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
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
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
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