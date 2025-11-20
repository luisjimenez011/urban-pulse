import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { Param } from '@nestjs/common';
import { RoutingService } from './routing.service';

// Definimos qué datos esperamos recibir (DTO - Data Transfer Object)
class CreateIncidentDto {
  title: string;
  description: string;
  lat: number;
  lng: number;
}

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly routingService: RoutingService,
  ) {}

  @Get()
  getHello(): object {
    return this.appService.getHello();
  }

  @Post('incidents')
  async createIncident(@Body() body: CreateIncidentDto) {
    return this.appService.createIncident(body);
  }

  @Get('incidents') // Nuevo endpoint: GET /api/v1/incidents
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
    @Query('end') end: string,     // lng,lat
  ) {
    const startCoords = start.split(',').map(Number) as [number, number];
    const endCoords = end.split(',').map(Number) as [number, number];

    // OSRM espera [Lng, Lat]
    return this.routingService.getRoute(startCoords, endCoords);
  }
  
}
