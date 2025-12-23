import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../shared/decorators/public';

@Public()
@ApiTags('Health')
@Controller('/health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Database Health Check',
    description: 'Check the database status',
  })
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> =>
        this.db.pingCheck('database', {
          timeout: 5000,
        }),
    ]);
  }
}
