import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from './unit.entity';
import { AppService } from './app.service';
import { forwardRef, Inject } from '@nestjs/common'; // <-- Importar forwardRef y Inject

@WebSocketGateway({ cors: true })
export class EventsGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private fleet: any[] = [];

  constructor(
    @InjectRepository(Unit)
    private unitRepo: Repository<Unit>,
    // SOLUCIÓN CIRCULARIDAD: Usamos forwardRef aquí.
    @Inject(forwardRef(() => AppService))
    private appService: AppService,
  ) {}

  async afterInit(server: Server) {
    console.log('🔄 Cargando flota desde la Base de Datos...');
    const dbUnits = await this.unitRepo.find();
    this.fleet = dbUnits.map((u) => ({
      id: u.id,
      name: u.name,
      type: u.type,
      status: u.status,
      lat: u.location.coordinates[1],
      lng: u.location.coordinates[0],
    }));

    console.log(`✅ Flota cargada: ${this.fleet.length} unidades.`); // Bucle de simulación

    setInterval(() => {
      this.fleet.forEach((unit) => {
        // Simular movimiento leve
        unit.lat += (Math.random() - 0.5) * 0.0005;
        unit.lng += (Math.random() - 0.5) * 0.0005; // Si la unidad está ASIGNADA, comprobamos si ha llegado

        if (unit.status === 'ASSIGNED') {
          // Llamamos al servicio para ejecutar la lógica de proximidad
          this.appService.checkUnitArrival(unit.id, unit.lat, unit.lng);
        }
      }); // Emitimos la flota con los IDs REALES

      this.server.emit('fleetUpdate', this.fleet);
    }, 3000); // Actualización cada 3 segundos
  }

  handleConnection(client: Socket) {
    client.emit('fleetUpdate', this.fleet);
  } // Método para actualizar el estado en la simulación cuando se despacha una unidad

  updateUnitStatus(unitId: string, status: string) {
    const unit = this.fleet.find((u) => u.id === unitId);
    if (unit) {
      unit.status = status; // Forzamos una actualización inmediata a los clientes
      this.server.emit('fleetUpdate', this.fleet);
    }
  }
}
