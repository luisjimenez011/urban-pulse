import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'; 

@Entity('units')
export class Unit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; 

  // --- NUEVOS TIPOS DE UNIDADES ---
  @Column({
    type: 'enum',
    enum: ['AMBULANCE', 'FIRE', 'CIVIL_GUARD', 'MUNICIPAL_POLICE', 'NATIONAL_POLICE'],
    default: 'AMBULANCE',
  })
  type: string;

  @Column({
    type: 'enum',
    enum: ['IDLE', 'BUSY', 'ASSIGNED', 'OFFLINE'],
    default: 'IDLE',
  })
  status: string;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  location: { type: string; coordinates: number[] };

  @CreateDateColumn()
  created_at: Date;
}