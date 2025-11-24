// server/src/incident.entity.ts (MODIFICADO)

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm'; 
import { Unit } from './unit.entity'; 
import { IncidentUnit } from './incident-unit.entity'; // <-- Importar la nueva entidad

@Entity('incidents')
export class Incident {
  @PrimaryGeneratedColumn('uuid')
  id: string;
// ... (title, description, status, priority, location, created_at) ...

  @Column()
  title: string;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'ASSIGNED', 'RESOLVED'],
    default: 'PENDING',
  })
  status: string;
  
  @Column({
    type: 'enum',
    enum: ['LOW', 'MEDIUM', 'HIGH'], 
    default: 'MEDIUM',
  })
  priority: string;

  // --- CAMPO NUEVO Y NECESARIO ---
  @Column({ 
    type: 'enum',
    enum: ['FIRE', 'MEDICAL', 'TRAFFIC', 'SECURITY', 'OTHER'],
    default: 'OTHER',
  })
  type: string; // <-- Nuevo tipo de incidente

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  location: { type: string; coordinates: number[] };

  @CreateDateColumn()
  created_at: Date;

  // --- ELIMINAR assigned_unit ---

  // --- NUEVA RELACIÓN ONE-TO-MANY ---
  @OneToMany(() => IncidentUnit, assignment => assignment.incident)
  assignments: IncidentUnit[]; // Lista de unidades asignadas
}