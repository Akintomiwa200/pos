import { Controller, Get, Param } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import type { IntegrationCategory } from './nigeria.catalog';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  list() {
    return this.integrationsService.list();
  }

  @Get(':category')
  byCategory(@Param('category') category: IntegrationCategory) {
    return this.integrationsService.byCategory(category);
  }
}
