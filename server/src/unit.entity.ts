import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('units') // Nombre exacto de la tabla en Supabase
export class Unit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  status: string;

  // Aquí mapeamos la columna PostGIS compleja a un objeto GeoJSON simple
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326, // Sistema de coordenadas estándar (GPS)
  })
  location: { type: string; coordinates: number[] };
}