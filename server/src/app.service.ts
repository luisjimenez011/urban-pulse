import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incident } from './incident.entity';
import { Unit } from './unit.entity';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Incident)
    private incidentRepo: Repository<Incident>,
    @InjectRepository(Unit)
    private unitRepo: Repository<Unit>,
  ) {}

  getHello(): object {
    return {
      status: 'OK',
      system: 'UrbanPulse Backend',
      timestamp: new Date(),
    };
  }

  // Función modificada para aceptar 'priority' como opcional
  async createIncident(data: { title: string, description: string, lng: number, lat: number, priority?: string }) {
    const newIncident = this.incidentRepo.create({
      title: data.title,
      description: data.description,
      location: { type: 'Point', coordinates: [data.lng, data.lat] } as any,
      status: 'PENDING', 
      
      priority: data.priority, // <--- ¡USAMOS EL VALOR ENVIADO! Si es HIGH, se guarda HIGH.
    });
    return this.incidentRepo.save(newIncident);
}

  async findAllIncidents() {
    // Añadimos 'relations' para ver qué unidad tiene asignada el incidente (si tiene alguna)
    return this.incidentRepo.find({ 
    relations: ['assigned_unit'],
    // PRIORIZACIÓN: Ordenación por prioridad (High, Medium, Low)
    order: {
        priority: 'DESC', 
        created_at: 'ASC',
    },
});
  }

  // --- MÉTODO: DESPACHAR ---
  async dispatchUnit(incidentId: string) {
    const incident = await this.incidentRepo.findOne({ where: { id: incidentId } });
    if (!incident) throw new NotFoundException('Incidente no encontrado');

    // 1. LÓGICA INTELIGENTE: Buscar la unidad 'IDLE' más cercana usando PostGIS.
    const nearestUnit = await this.unitRepo.createQueryBuilder('unit')
        .where('unit.status = :status', { status: 'IDLE' })
        .orderBy('ST_Distance(unit.location::geography, ST_GeomFromGeoJSON(:incidentLocation)::geography)', 'ASC')
        .setParameter('incidentLocation', JSON.stringify(incident.location)) 
        .limit(1) 
        .getOne();

    if (!nearestUnit) {
      return { status: 'ERROR', message: 'No hay unidades disponibles.' };
    }

    // 2. Realizar la asignación
    incident.status = 'ASSIGNED';
    incident.assigned_unit = nearestUnit;

    nearestUnit.status = 'BUSY';

    await this.unitRepo.save(nearestUnit);
    const savedIncident = await this.incidentRepo.save(incident);

    return { status: 'SUCCESS', incident: savedIncident, unit: nearestUnit };
  }
}