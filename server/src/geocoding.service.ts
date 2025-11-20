// server/src/geocoding.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios'; // <-- ¡IMPORTACIÓN CAMBIADA!
import { firstValueFrom } from 'rxjs'; // Necesario para manejar el Observable

@Injectable()
export class GeocodingService {
  private nominatimUrl = 'https://nominatim.openstreetmap.org/search';

  // Inyección de HttpService de NestJS en el constructor
  constructor(private readonly httpService: HttpService) {}

  async geocodeAddress(address: string): Promise<any> {
    if (!address) {
      throw new BadRequestException('Se requiere una dirección.');
    }

    try {
      // Usamos firstValueFrom para convertir el Observable en una Promesa
      const response = await firstValueFrom(
        this.httpService.get(this.nominatimUrl, {
          params: {
            q: address,
            format: 'json',
            limit: 1, 
          },
          // IMPORTANTE: Nominatim requiere un User-Agent.
          headers: {
            'User-Agent': 'UrbanPulseDispatchApp/1.0',
          },
        }),
      );
      
      const data = response.data;

      if (data && data.length > 0) {
        const result = data[0];
        // Devolvemos las coordenadas en el orden [lng, lat] (GeoJSON/PostGIS)
        return {
          lng: parseFloat(result.lon),
          lat: parseFloat(result.lat),
        };
      }
      return null; // Dirección no encontrada
    } catch (error) {
      console.error('Error al geocodificar:', error.message);
      // Podemos devolver null o relanzar una excepción amigable
      return null; 
    }
  }
}