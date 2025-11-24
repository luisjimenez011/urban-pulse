// server/src/unit.entity.ts (MODIFICADO)

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm'; 
import { IncidentUnit } from './incident-unit.entity'; // <-- ¡IMPORTAR LA NUEVA ENTIDAD!

@Entity('units')
export class Unit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; 

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

  // --- RELACIÓN INVERSA ONE-TO-MANY (NECESARIO PARA EL ERROR TS2339) ---
  // Una Unidad puede tener muchas asignaciones vinculadas a ella
  @OneToMany(() => IncidentUnit, assignment => assignment.unit)
  assignments: IncidentUnit[]; // <-- ¡ESTA PROPIEDAD DEBE EXISTIR!
}