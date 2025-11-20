// server/src/routing.service.ts
import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class RoutingService {
  // OSRM: Usaremos un servidor de demostración público para no complicarnos con Docker AHORA.
  private osrmBaseUrl = 'http://router.project-osrm.org/route/v1/driving';

  // Recibe coordenadas de inicio y fin.
  async getRoute(startLngLat: [number, number], endLngLat: [number, number]): Promise<any> {
    const start = startLngLat.join(',');
    const end = endLngLat.join(',');
    
    // URL: /route/v1/driving/lng1,lat1;lng2,lat2?overview=full&geometries=geojson
    const url = `${this.osrmBaseUrl}/${start};${end}?overview=full&geometries=geojson`;

    try {
      const response = await axios.get(url);
      
      if (response.data.routes && response.data.routes.length > 0) {
        // Devolvemos solo la geometría de la ruta
        return response.data.routes[0].geometry.coordinates;
      }
      return null;
    } catch (error) {
      console.error('Error fetching route from OSRM:', error.message);
      return null;
    }
  }
}