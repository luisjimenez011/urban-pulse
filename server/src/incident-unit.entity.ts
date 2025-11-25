import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, CreateDateColumn } from 'typeorm';
import { Incident } from './incident.entity';
import { Unit } from './unit.entity';

// Tipos de estado para la asignación
export type IncidentUnitStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELED';

@Entity('incident_unit')
export class IncidentUnit {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Incident, incident => incident.assignments, { onDelete: 'CASCADE' })
    incident: Incident;

    @ManyToOne(() => Unit, unit => unit.assignments, { onDelete: 'CASCADE' })
    unit: Unit;

    @Column({
        type: 'varchar',
        length: 20,
        default: 'ACTIVE', // Estado inicial de la asignación
        comment: 'Estado de la asignación: ACTIVE, COMPLETED, CANCELED'
    })
    status: IncidentUnitStatus; // AÑADIDO: Estado de la asignación

    @CreateDateColumn({ type: 'timestamp with time zone' })
    assigned_at: Date;
}