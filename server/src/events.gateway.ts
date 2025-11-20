import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true }) // Permitir conexión desde React
export class EventsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: any) {
    console.log('Cliente conectado:', client.id);
  }

  // SIMULACIÓN: Mover la ambulancia un poquito cada 3 segundos
  constructor() {
    let lat = 40.416775; // Madrid Centro
    let lng = -3.703790;

    setInterval(() => {
      // Movemos las coordenadas ligeramente
      lat += 0.0001; 
      lng += 0.0001;

      // Emitimos el evento 'positionUpdate' a todos los conectados (React)
      this.server.emit('positionUpdate', {
        id: 'ambulancia-01',
        position: [lat, lng]
      });
      
      console.log(`Emitiendo nueva posición: ${lat}, ${lng}`);
    }, 3000); // Cada 3000ms (3 segundos)
  }
}