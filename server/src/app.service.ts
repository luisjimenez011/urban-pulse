import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incident } from './incident.entity';
import { Unit } from './unit.entity';
import { EventsGateway } from './events.gateway'; // <--- IMPORTAR

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Incident) private incidentRepo: Repository<Incident>,
    @InjectRepository(Unit) private unitRepo: Repository<Unit>,
    private eventsGateway: EventsGateway, // <--- INYECTAR
  ) {}

  getHello(): object {
    return { status: 'OK', system: 'UrbanPulse Backend' };
  }

  async createIncident(data: { title: string, description: string, lng: number, lat: number, priority?: string }) {
    const newIncident = this.incidentRepo.create({
      title: data.title,
      description: data.description,
      location: { type: 'Point', coordinates: [data.lng, data.lat] } as any,
      status: 'PENDING',
      priority: data.priority,
    });
    return this.incidentRepo.save(newIncident);
  }

  async findAllIncidents() {
    return this.incidentRepo.find({ 
      relations: ['assigned_unit'],
      order: { priority: 'DESC', created_at: 'ASC' },
    });
  }

  // --- DESPACHO CON ACTUALIZACIÓN EN VIVO ---
  async dispatchUnit(incidentId: string) {
    const incident = await this.incidentRepo.findOne({ where: { id: incidentId } });
    if (!incident) throw new NotFoundException('Incidente no encontrado');

    // Busca la unidad IDLE más cercana
    const nearestUnit = await this.unitRepo.createQueryBuilder('unit')
        .where('unit.status = :status', { status: 'IDLE' })
        .orderBy('ST_Distance(unit.location::geography, ST_GeomFromGeoJSON(:incidentLocation)::geography)', 'ASC')
        .setParameter('incidentLocation', JSON.stringify(incident.location)) 
        .limit(1) 
        .getOne();

    if (!nearestUnit) {
      return { status: 'ERROR', message: 'No hay unidades disponibles.' };
    }

    // Guardar en BD
    incident.status = 'ASSIGNED';
    incident.assigned_unit = nearestUnit;
    nearestUnit.status = 'BUSY';

    await this.unitRepo.save(nearestUnit);
    const savedIncident = await this.incidentRepo.save(incident);

    // AVISTAR AL SIMULADOR (Esto hace que la línea aparezca en el mapa)
    this.eventsGateway.updateUnitStatus(nearestUnit.id, 'BUSY');

    return { status: 'SUCCESS', incident: savedIncident, unit: nearestUnit };
  }
}