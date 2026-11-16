import { Global, Module } from '@nestjs/common';
import { AppMetrics } from '../../application/shared/metrics/app-metrics';
import { MetricsServer } from './metrics-server';
import { PromAppMetrics } from './prom-app-metrics';
import { RuntimeGaugesService } from './runtime-gauges.service';

@Global()
@Module({
  providers: [
    PromAppMetrics,
    { provide: AppMetrics, useExisting: PromAppMetrics },
    MetricsServer,
    RuntimeGaugesService,
  ],
  exports: [AppMetrics, PromAppMetrics],
})
export class MetricsModule {}
