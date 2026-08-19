import { Injectable, NotFoundException } from '@nestjs/common';
import {
  NIGERIA_INTEGRATIONS,
  type IntegrationCategory,
} from './nigeria.catalog';

@Injectable()
export class IntegrationsService {
  list() {
    return {
      market: 'NG',
      currency: 'NGN',
      vatBps: 750,
      groups: NIGERIA_INTEGRATIONS,
    };
  }

  byCategory(category: IntegrationCategory) {
    const group = NIGERIA_INTEGRATIONS.find((item) => item.category === category);
    if (!group) {
      throw new NotFoundException(`Unknown integration category: ${category}`);
    }
    return group;
  }
}
