import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';

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
}