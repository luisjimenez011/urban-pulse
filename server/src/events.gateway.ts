import { 
  WebSocketGateway, 
  WebSocketServer, 
  OnGatewayInit, 
  OnGatewayConnection 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from './unit.entity';

@WebSocketGateway({ cors: true })
export class EventsGateway implements OnGatewayInit, OnGatewayConnection {
  
  @WebSocketServer()
  server: Server;

  // Memoria local para la simulación (para no saturar la BD con escrituras constantes)
  private fleet: any[] = [];

  constructor(
    @InjectRepository(Unit)
    private unitRepo: Repository<Unit>, // Inyectamos el repo para leer la BD real
  ) {}

  async afterInit(server: Server) {
    console.log('🔄 Cargando flota desde la Base de Datos...');
    
    // 1. Cargar unidades reales de la BD
    const dbUnits = await this.unitRepo.find();
    
    // 2. Convertirlas al formato de simulación (extraer lat/lng del objeto location)
    this.fleet = dbUnits.map(u => ({
      id: u.id, // ¡IMPORTANTE! Usamos el UUID real
      name: u.name,
      type: u.type,
      status: u.status,
      lat: u.location.coordinates[1], // PostGIS es [lng, lat]
      lng: u.location.coordinates[0]
    }));

    console.log(`✅ Flota cargada: ${this.fleet.length} unidades.`);

    // 3. Bucle de simulación
    setInterval(() => {
      this.fleet.forEach(unit => {
        // Simular movimiento leve
        unit.lat += (Math.random() - 0.5) * 0.0005;
        unit.lng += (Math.random() - 0.5) * 0.0005;
      });

      // Emitimos la flota con los IDs REALES
      this.server.emit('fleetUpdate', this.fleet);
    }, 3000);
  }

  handleConnection(client: Socket) {
    client.emit('fleetUpdate', this.fleet);
  }

  // Método para actualizar el estado en la simulación cuando se despacha una unidad
  updateUnitStatus(unitId: string, status: string) {
    const unit = this.fleet.find(u => u.id === unitId);
    if (unit) {
      unit.status = status;
      // Forzamos una actualización inmediata a los clientes
      this.server.emit('fleetUpdate', this.fleet);
    }
  }
}