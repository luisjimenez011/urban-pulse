import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: 'postgresql://postgres:oU:_1m8E){97@db.ehnqvmgkyufhceqoykag.supabase.co:5432/postgres', 
      autoLoadEntities: true,
      synchronize: true, // Solo para desarrollo: crea tablas automáticamente si faltan
      ssl: { rejectUnauthorized: false }, // Necesario para Supabase
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}