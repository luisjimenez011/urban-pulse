import {
  Injectable,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incident } from './incident.entity';
import { Unit } from './unit.entity';
import { IncidentUnit } from './incident-unit.entity';
import { EventsGateway } from './events.gateway';

// Definimos el umbral de distancia (aprox. 100-111 metros en Lat/Lng)
const ARRIVAL_THRESHOLD_LAT_LNG = 0.001;

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Incident) private incidentRepo: Repository<Incident>,
    @InjectRepository(Unit) private unitRepo: Repository<Unit>,
    @InjectRepository(IncidentUnit)
    private assignmentRepo: Repository<IncidentUnit>,
    // SOLUCIÓN CIRCULARIDAD: Usamos forwardRef aquí.
    @Inject(forwardRef(() => EventsGateway))
    private eventsGateway: EventsGateway,
  ) {}

  getHello(): object {
    return { status: 'OK', system: 'UrbanPulse Backend' };
  }

  async createIncident(data: {
    title: string;
    description: string;
    lng: number;
    lat: number;
    priority?: string;
  }) {
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
      relations: ['assignments', 'assignments.unit'],
      order: { priority: 'DESC', created_at: 'ASC' },
    });
  } // --- FUNCIÓN CONTROLADA: Añadir unidad por tipo ---

  async addUnitToIncident(incidentId: string, unitType: string) {
    const incident = await this.incidentRepo.findOne({
      where: { id: incidentId },
    });
    if (!incident) throw new NotFoundException('Incidente no encontrado'); // 1. Buscar la unidad IDLE más cercana que coincida con el tipo

    const nearestUnit = await this.unitRepo
      .createQueryBuilder('unit')
      .where('unit.status = :status', { status: 'IDLE' })
      .andWhere('unit.type = :type', { type: unitType })
      .orderBy(
        'ST_Distance(unit.location::geography, ST_GeomFromGeoJSON(:incidentLocation)::geography)',
        'ASC',
      )
      .setParameter('incidentLocation', JSON.stringify(incident.location))
      .limit(1)
      .getOne();

    if (!nearestUnit) {
      return {
        status: 'ERROR',
        message: `No hay unidades disponibles de tipo ${unitType}.`,
      };
    } // 2. Crear una nueva asignación

    const newAssignment = this.assignmentRepo.create({
      incident: incident,
      unit: nearestUnit,
      status: 'ACTIVE', // La asignación está activa
    }); // 3. Guardar en BD (Asignación y Unidad)

    await this.assignmentRepo.save(newAssignment); // CORRECCIÓN: El estado inicial debe ser ASSIGNED (En Ruta)
    nearestUnit.status = 'ASSIGNED';
    await this.unitRepo.save(nearestUnit); // 4. Actualizar estado del incidente (si es la primera unidad)

    if (incident.status === 'PENDING') {
      incident.status = 'ASSIGNED';
      await this.incidentRepo.save(incident);
    } // 5. AVISTAR AL SIMULADOR: para que sepa que la unidad ya está en ruta

    this.eventsGateway.updateUnitStatus(nearestUnit.id, 'ASSIGNED');

    return { status: 'SUCCESS', assignment: newAssignment, unit: nearestUnit };
  } // --- MÉTODO PARA MONITOREAR LA LLEGADA ---
  async checkUnitArrival(
    unitId: string,
    currentLat: number,
    currentLng: number,
  ) {
    // Buscamos la unidad con sus asignaciones y el incidente
    const unit = await this.unitRepo.findOne({
      where: { id: unitId },
      relations: ['assignments', 'assignments.incident'],
    }); // Solo nos interesa si está ASIGNADA

    if (
      !unit ||
      unit.status !== 'ASSIGNED' ||
      !unit.assignments ||
      unit.assignments.length === 0
    ) {
      return;
    } // Buscamos la asignación ACTIVA (la más reciente que esté en curso)
    const activeAssignment = unit.assignments.find(
      (a) => a.status === 'ACTIVE',
    );
    if (!activeAssignment) return;

    const incident = activeAssignment.incident; // Obtener coordenadas del incidente [Lng, Lat]

    const incLat = incident.location.coordinates[1];
    const incLng = incident.location.coordinates[0]; // 1. Calcular la distancia (Euclidiana)

    const distance = Math.sqrt(
      Math.pow(currentLat - incLat, 2) + Math.pow(currentLng - incLng, 2),
    ); // 2. Comprobar si ha llegado
    if (distance <= ARRIVAL_THRESHOLD_LAT_LNG) {
      console.log(
        `✅ Unidad ${unit.name} ha llegado al incidente ${incident.id}. Cambiando a BUSY.`,
      ); // 3. Actualizar el estado de la UNIDAD en la BD a BUSY (En el lugar)

      await this.unitRepo.update(unitId, {
        status: 'BUSY',
      }); // 4. Actualizar el estado en la SIMULACIÓN (para que el bucle deje de chequearlo)

      this.eventsGateway.updateUnitStatus(unit.id, 'BUSY');
    }
  }

  // --- FASE 3: RESOLVER INCIDENTE Y LIBERAR UNIDADES ---
    async resolveIncident(incidentId: string) {
        // 1. Recuperar el incidente con sus asignaciones y las unidades vinculadas
        const incident = await this.incidentRepo.findOne({ 
            where: { id: incidentId },
            relations: ['assignments', 'assignments.unit'],
        });

        if (!incident) throw new NotFoundException('Incidente no encontrado');

        // 2. Iterar sobre las asignaciones para liberar unidades
        if (incident.assignments) {
            for (const assignment of incident.assignments) {
                // Solo liberamos si la asignación estaba activa
                if (assignment.status === 'ACTIVE') {
                    // A. Marcar asignación como completada
                    assignment.status = 'COMPLETED';
                    await this.assignmentRepo.save(assignment);

                    // B. Liberar la unidad (volver a IDLE)
                    const unit = assignment.unit;
                    unit.status = 'IDLE';
                    await this.unitRepo.save(unit);

                    // C. Notificar al simulador para actualizar el mapa en vivo
                    this.eventsGateway.updateUnitStatus(unit.id, 'IDLE');
                }
            }
        }

        // 3. Cerrar el incidente
        incident.status = 'RESOLVED';
        await this.incidentRepo.save(incident);

        return { status: 'SUCCESS', message: 'Incidente resuelto y unidades liberadas' };
    }
}
