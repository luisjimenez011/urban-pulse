// server/src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios'; 
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsGateway } from './events.gateway'; 
import { Unit } from './unit.entity';
import { Incident } from './incident.entity'; 
import { RoutingService } from './routing.service';
import { GeocodingService } from './geocoding.service'; 


@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: 'postgresql://postgres:oU:_1m8E){97@db.ehnqvmgkyufhceqoykag.supabase.co:5432/postgres',
      entities: [Unit, Incident], 
      synchronize: true, 
      ssl: { rejectUnauthorized: false },
    }),
    TypeOrmModule.forFeature([Incident, Unit]), 
    HttpModule, // <-- ¡AÑADIDO PARA HABILITAR PETICIONES EXTERNAS!
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    EventsGateway, 
    RoutingService, 
    GeocodingService, // <-- ¡AÑADIDO PARA RESOLVER DEPENDENCIA EN AppController!
  ],
})
export class AppModule {}