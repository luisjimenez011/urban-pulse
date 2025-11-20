import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'; 
import { Unit } from './unit.entity'; 

@Entity('incidents')
export class Incident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
  
  // --- NUEVO CAMPO: PRIORIDAD ---
  @Column({
    type: 'enum',
    enum: ['LOW', 'MEDIUM', 'HIGH'], 
    default: 'MEDIUM',
  })
  priority: string;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  location: { type: string; coordinates: number[] };

  @CreateDateColumn()
  created_at: Date;

  // --- RELACIÓN ---
  @ManyToOne(() => Unit, { nullable: true })
  @JoinColumn({ name: 'assigned_unit_id' }) 
  assigned_unit: Unit;
}