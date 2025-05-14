import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { DeliveryZoneService } from './delivery-zone.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';
import { DeliveryZoneEntity } from './entities/delivery-zone.entity';

@ApiTags('Delivery Zones')
@Controller('delivery-zones')
export class DeliveryZoneController {
  constructor(private readonly service: DeliveryZoneService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new delivery zone' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Delivery zone created',
    type: DeliveryZoneEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Restaurant not found',
  })
  create(@Body() createDto: CreateDeliveryZoneDto) {
    return this.service.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all delivery zones for restaurant' })
  @ApiQuery({
    name: 'restaurantId',
    required: true,
    description: 'Restaurant ID to filter zones',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of delivery zones',
    type: [DeliveryZoneEntity],
  })
  findAllByRestaurant(@Query('restaurantId') restaurantId: string) {
    return this.service.findAllByRestaurant(restaurantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update delivery zone' })
  @ApiParam({ name: 'id', description: 'Delivery zone ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Updated delivery zone',
    type: DeliveryZoneEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Zone not found',
  })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDeliveryZoneDto,
  ) {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete delivery zone' })
  @ApiParam({ name: 'id', description: 'Delivery zone ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deleted delivery zone',
    type: DeliveryZoneEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Zone not found',
  })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

 @Get('coverage/check')
  @ApiOperation({ 
    summary: 'Check point coverage in delivery zones', 
    description: 'Check if geographical point is within any delivery zone of specified restaurant' 
  })
  @ApiQuery({ name: 'restaurantId', required: true, example: 'clm1x9q8d0000pvow8q2q3k4z' })
  @ApiQuery({ name: 'lat', required: true, type: Number, example: 41.6938 })
  @ApiQuery({ name: 'lng', required: true, type: Number, example: 44.8015 })
  @ApiResponse({ status: HttpStatus.OK, type: DeliveryZoneEntity })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'No coverage found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid parameters' })
  async checkCoverage(
    @Query('restaurantId') restaurantId: string,
    @Query('lat') lat: number,
    @Query('lng') lng: number,
  ) {
    const zone = await this.service.findZoneForPoint(restaurantId, lat, lng);
    return zone || { statusCode: HttpStatus.NO_CONTENT };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get delivery zone by ID' })
  @ApiParam({ name: 'id', example: '233fccb2-8c78-4732-ba10-868483addeed' })
  @ApiResponse({ status: HttpStatus.OK, type: DeliveryZoneEntity })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Zone not found' })
  async findone(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}