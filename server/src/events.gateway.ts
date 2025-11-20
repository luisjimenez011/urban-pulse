import { 
  WebSocketGateway, 
  WebSocketServer, 
  OnGatewayInit, 
  OnGatewayConnection 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class EventsGateway implements OnGatewayInit, OnGatewayConnection {
  
  @WebSocketServer()
  server: Server;

  // Este método se ejecuta AUTOMÁTICAMENTE cuando el servidor está listo
  afterInit(server: Server) {
    console.log('WebSocket Gateway inicializado');
    
    // Movemos el intervalo aquí, donde es seguro usar this.server
    let lat = 40.416775;
    let lng = -3.703790;

    setInterval(() => {
      lat += 0.0001;
      lng += 0.0001;

      // Ahora sí podemos emitir sin que explote
      this.server.emit('positionUpdate', {
        id: 'ambulancia-01',
        position: [lat, lng]
      });
    }, 3000);
  }

  handleConnection(client: Socket) {
    console.log('Cliente conectado:', client.id);
  }
}