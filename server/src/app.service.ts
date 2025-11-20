import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incident } from './incident.entity';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Incident)
    private incidentRepo: Repository<Incident>,
  ) {}

  getHello(): object {
    return { status: 'OK', system: 'UrbanPulse Backend', timestamp: new Date() };
  }

  async createIncident(data: { title: string; description: string; lat: number; lng: number }) {
    const newIncident = this.incidentRepo.create({
      title: data.title,
      description: data.description,
      location: {
        type: 'Point',
        coordinates: [data.lng, data.lat], // OJO: PostGIS usa [Longitud, Latitud]
      },
    });

    const saved = await this.incidentRepo.save(newIncident);
    console.log('Incidente guardado:', saved.id);
    return saved;
  }

  async findAllIncidents() {
    return this.incidentRepo.find();
  }
}