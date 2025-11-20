import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { Param } from '@nestjs/common';

// Definimos qué datos esperamos recibir (DTO - Data Transfer Object)
class CreateIncidentDto {
  title: string;
  description: string;
  lat: number;
  lng: number;
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

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
  
}