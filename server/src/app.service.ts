import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incident } from './incident.entity';
import { Unit } from './unit.entity';
import { IncidentUnit } from './incident-unit.entity';
import { EventsGateway } from './events.gateway'; // <--- IMPORTAR

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Incident) private incidentRepo: Repository<Incident>,
    @InjectRepository(Unit) private unitRepo: Repository<Unit>,
    @InjectRepository(IncidentUnit) private assignmentRepo: Repository<IncidentUnit>, 
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

  // --- Función principal: Cargar todos los incidentes con TODAS sus asignaciones ---
  async findAllIncidents() {
    return this.incidentRepo.find({ 
      // Relacionar las asignaciones, y luego la unidad vinculada a cada asignación
      relations: ['assignments', 'assignments.unit'], 
      order: { priority: 'DESC', created_at: 'ASC' },
    });
  }


  // --- NUEVA FUNCIÓN CONTROLADA: Añadir unidad por tipo ---
  async addUnitToIncident(incidentId: string, unitType: string) {
    const incident = await this.incidentRepo.findOne({ where: { id: incidentId } });
    if (!incident) throw new NotFoundException('Incidente no encontrado');

    // 1. Buscar la unidad IDLE más cercana que coincida con el tipo
    const nearestUnit = await this.unitRepo.createQueryBuilder('unit')
        .where('unit.status = :status', { status: 'IDLE' })
        .andWhere('unit.type = :type', { type: unitType }) // <-- FILTRAR POR TIPO
        .orderBy('ST_Distance(unit.location::geography, ST_GeomFromGeoJSON(:incidentLocation)::geography)', 'ASC')
        .setParameter('incidentLocation', JSON.stringify(incident.location)) 
        .limit(1) 
        .getOne();

    if (!nearestUnit) {
      return { status: 'ERROR', message: `No hay unidades disponibles de tipo ${unitType}.` };
    }

    // 2. Crear una nueva asignación
    const newAssignment = this.assignmentRepo.create({
      incident: incident,
      unit: nearestUnit,
    });

    // 3. Guardar en BD (Asignación y Unidad)
    await this.assignmentRepo.save(newAssignment);
    nearestUnit.status = 'BUSY';
    await this.unitRepo.save(nearestUnit);

    // 4. Actualizar estado del incidente (si es la primera unidad)
    if (incident.status === 'PENDING') {
        incident.status = 'ASSIGNED';
        await this.incidentRepo.save(incident);
    }

    // AVISTAR AL SIMULADOR
    this.eventsGateway.updateUnitStatus(nearestUnit.id, 'BUSY');

    return { status: 'SUCCESS', assignment: newAssignment, unit: nearestUnit };
  }
  
  // ELIMINAR la función 'dispatchUnit' antigua
}