import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): object {
  return { status: 'OK', system: 'UrbanPulse Backend', timestamp: new Date() };
}
}
