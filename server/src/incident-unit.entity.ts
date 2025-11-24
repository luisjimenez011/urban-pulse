

import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
import { Incident } from './incident.entity';
import { Unit } from './unit.entity';


@Entity('incident_unit')
export class IncidentUnit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: new Date() }) // Opcional: para saber cuándo se asignó
  assigned_at: Date;

  // Relación: Una asignación pertenece a un Incidente
  @ManyToOne(() => Incident, incident => incident.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'incident_id' })
  incident: Incident;
  
  // Relación: Una asignación vincula a una Unidad
  @ManyToOne(() => Unit, unit => unit.assignments, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;
}