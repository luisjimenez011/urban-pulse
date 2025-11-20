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

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  location: { type: string; coordinates: number[] };

  @CreateDateColumn()
  created_at: Date;

  // --- NUEVA RELACIÓN ---
  @ManyToOne(() => Unit, { nullable: true })
  @JoinColumn({ name: 'assigned_unit_id' }) 
  assigned_unit: Unit;
}