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
    return { status: 'OK', system: 'UrbanPulse Backend', timestamp: new Date() };
  }

  async createIncident(data: any) {
    const newIncident = this.incidentRepo.create({
      title: data.title,
      description: data.description,
      location: { type: 'Point', coordinates: [data.lng, data.lat] },
    });
    return this.incidentRepo.save(newIncident);
  }

  async findAllIncidents() {
    // Añadimos 'relations' para ver qué unidad tiene asignada el incidente (si tiene alguna)
    return this.incidentRepo.find({ relations: ['assigned_unit'] });
  }

  // --- NUEVO MÉTODO: DESPACHAR ---
  async dispatchUnit(incidentId: string) {
    // 1. Buscar el incidente
    const incident = await this.incidentRepo.findOne({ where: { id: incidentId } });
    if (!incident) throw new NotFoundException('Incidente no encontrado');

    // 2. Buscar una unidad disponible (Status = IDLE)
    // En el futuro usaremos PostGIS para buscar la "más cercana", hoy la primera que encontremos.
    const unit = await this.unitRepo.findOne({ where: { status: 'IDLE' } });
    
    if (!unit) {
      return { status: 'ERROR', message: 'No hay unidades disponibles' };
    }

    // 3. Realizar la asignación
    incident.status = 'ASSIGNED';
    incident.assigned_unit = unit; // TypeORM maneja la relación por nosotros

    unit.status = 'BUSY'; // Ocupamos la unidad

    // 4. Guardar cambios en transacción (idealmente) o secuencial
    await this.unitRepo.save(unit);
    const savedIncident = await this.incidentRepo.save(incident);

    return { status: 'SUCCESS', incident: savedIncident, unit: unit };
  }
}