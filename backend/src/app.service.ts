import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  info() {
    return {
      name: 'pos-backend',
      clients: {
        web: 'http://localhost:3000',
        pos: 'http://localhost:1420',
      },
    };
  }
}
