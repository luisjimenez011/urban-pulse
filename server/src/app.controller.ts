import { Controller, Get, Post, Body, Query, BadRequestException, NotFoundException } from '@nestjs/common';
import { AppService } from './app.service';
import { Param } from '@nestjs/common';
import { RoutingService } from './routing.service';
import { GeocodingService } from './geocoding.service';


// Definimos qué datos esperamos recibir (DTO - Data Transfer Object)
class CreateIncidentDto {
  title: string;
  description: string;
  lat: number;
  lng: number;
  // Hacemos 'priority' opcional para evitar errores en la ruta '/incidents'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'; 
}

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly routingService: RoutingService,
    private readonly geocodingService: GeocodingService,
  ) {}

  @Get()
  getHello(): object {
    return this.appService.getHello();
  }

  @Post('incidents')
  async createIncident(@Body() body: CreateIncidentDto) {
    // TypeScript ya no lanza error porque 'priority' es opcional en el DTO
    return this.appService.createIncident(body); 
  }

  @Get('incidents') 
  async getIncidents() {
    return this.appService.findAllIncidents();
  }

  @Post('incidents/:id/dispatch')
  async dispatch(@Param('id') id: string) {
    return this.appService.dispatchUnit(id);
  }

  @Get('route')
  async getRoute(
    @Query('start') start: string, // lng,lat
    @Query('end') end: string,     // lng,lat
  ) {
    const startCoords = start.split(',').map(Number) as [number, number];
    const endCoords = end.split(',').map(Number) as [number, number];

    // OSRM espera [Lng, Lat]
    return this.routingService.getRoute(startCoords, endCoords);
  }

  @Post('incident-by-address')
async createIncidentByAddress(
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('address') address: string, 
    @Body('priority') priority: 'LOW' | 'MEDIUM' | 'HIGH', // <--- CAPTURAMOS LA PRIORIDAD
) {
    if (!address) {
        throw new BadRequestException('La dirección es requerida.');
    }

    const coords = await this.geocodingService.geocodeAddress(address);

    if (!coords) {
        throw new NotFoundException('Dirección no encontrada por el servicio de geocodificación.');
    }

    // Pasamos la prioridad capturada al servicio
    return this.appService.createIncident({
        title,
        description,
        lat: coords.lat, 
        lng: coords.lng,
        priority, // <--- PASAMOS LA PRIORIDAD
    });
}
  
}