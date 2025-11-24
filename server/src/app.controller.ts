// server/src/app.controller.ts (MODIFICADO)

import { Controller, Get, Post, Body, Query, BadRequestException, NotFoundException, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { RoutingService } from './routing.service';
import { GeocodingService } from './geocoding.service';

// --- NUEVO DTO para el Despacho Controlado ---
class DispatchUnitDto {
    // Esperamos un string que será el tipo de unidad (e.g., 'FIRE', 'AMBULANCE')
    unitType: string;
}

// Definimos qué datos esperamos recibir (DTO - Data Transfer Object)
class CreateIncidentDto {
    title: string;
    description: string;
    lat: number;
    lng: number;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
}

@Controller('api/v1') // Añadir prefijo para claridad en las rutas
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
        return this.appService.createIncident(body);
    }

    @Get('incidents') 
    async getIncidents() {
        return this.appService.findAllIncidents();
    }

    // --- ENDPOINT DE DESPACHO MODIFICADO ---
    @Post('incidents/:id/dispatch')
    async dispatch(
        @Param('id') id: string,
        @Body() body: DispatchUnitDto, // <-- Capturamos el cuerpo de la petición (unitType)
    ) {
        if (!body.unitType) {
            throw new BadRequestException('El campo unitType es requerido para el despacho controlado.');
        }
        
        // Llamamos a la nueva función del servicio que espera el tipo de unidad
        return this.appService.addUnitToIncident(id, body.unitType.toUpperCase()); 
    }

    @Get('route')
    async getRoute(
        @Query('start') start: string, // lng,lat
        @Query('end') end: string,     // lng,lat
    ) {
        const startCoords = start.split(',').map(Number) as [number, number];
        const endCoords = end.split(',').map(Number) as [number, number];

        return this.routingService.getRoute(startCoords, endCoords);
    }
    
    // ... (Endpoint 'incident-by-address' sigue igual) ...
    @Post('incident-by-address')
    async createIncidentByAddress(
        @Body('title') title: string,
        @Body('description') description: string,
        @Body('address') address: string, 
        @Body('priority') priority: 'LOW' | 'MEDIUM' | 'HIGH',
    ) {
        if (!address) {
            throw new BadRequestException('La dirección es requerida.');
        }

        const coords = await this.geocodingService.geocodeAddress(address);

        if (!coords) {
            throw new NotFoundException('Dirección no encontrada por el servicio de geocodificación.');
        }

        return this.appService.createIncident({
            title,
            description,
            lat: coords.lat, 
            lng: coords.lng,
            priority,
        });
    }
}