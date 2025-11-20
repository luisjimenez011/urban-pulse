import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsGateway } from './events.gateway';
import { Unit } from './unit.entity';
import { Incident } from './incident.entity'; 
import { RoutingService } from './routing.service';

@Module({
  imports: [
    // 1. Configuración global de la Base de Datos (esto ya lo tenías)
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: 'postgresql://postgres:oU:_1m8E){97@db.ehnqvmgkyufhceqoykag.supabase.co:5432/postgres',
      entities: [Unit, Incident], 
      synchronize: true, // OJO: Ponlo en true un momento para que cree la tabla incidents, luego false
      ssl: { rejectUnauthorized: false },
    }),

    // 2. AQUÍ ESTÁ LA SOLUCIÓN:
    // Esto crea los Repositorios para que el Service los pueda usar
    TypeOrmModule.forFeature([Incident,Unit]), 
  ],
  controllers: [AppController],
  providers: [AppService, EventsGateway, RoutingService],
})
export class AppModule {}