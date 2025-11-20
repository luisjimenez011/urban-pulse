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
    const incident = await this.incidentRepo.findOne({
      where: { id: incidentId },
    });
    if (!incident) throw new NotFoundException('Incidente no encontrado');

    // 1. LÓGICA INTELIGENTE: Buscar la unidad 'IDLE' más cercana usando PostGIS.
    const nearestUnit = await this.unitRepo
      .createQueryBuilder('unit')
      .where('unit.status = :status', { status: 'IDLE' })
      // Añadimos la cláusula ORDER BY usando la función ST_Distance para calcular la distancia
      // entre la ubicación de la unidad y la ubicación del incidente (PostGIS).
      .orderBy(
        'ST_Distance(unit.location::geography, :incidentLocation::geography)',
        'ASC',
      )
      .setParameter('incidentLocation', incident.location)
      .limit(1) // Solo queremos la primera (la más cercana)
      .getOne();

    if (!nearestUnit) {
      return { status: 'ERROR', message: 'No hay unidades disponibles.' };
    }

    // 2. Realizar la asignación (el resto es igual)
    incident.status = 'ASSIGNED';
    incident.assigned_unit = nearestUnit;

    nearestUnit.status = 'BUSY';

    await this.unitRepo.save(nearestUnit);
    const savedIncident = await this.incidentRepo.save(incident);

    return { status: 'SUCCESS', incident: savedIncident, unit: nearestUnit };
  }
}
