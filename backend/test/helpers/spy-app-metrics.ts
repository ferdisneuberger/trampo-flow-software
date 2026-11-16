import { NoopAppMetrics } from '../../src/application/shared/metrics/app-metrics';

/** Registra cada evento da porta: `calls` guarda `[método, ...argumentos]`. */
export class SpyAppMetrics extends NoopAppMetrics {
  readonly calls: [string, ...unknown[]][] = [];

  constructor() {
    super();

    const target = this as unknown as Record<string, unknown>;

    for (const name of Object.getOwnPropertyNames(NoopAppMetrics.prototype)) {
      if (name !== 'constructor') {
        target[name] = (...args: unknown[]) => {
          this.calls.push([name, ...args]);
        };
      }
    }
  }

  /** Eventos de um método, só com os argumentos. */
  of(method: string): unknown[][] {
    return this.calls
      .filter(([name]) => name === method)
      .map(([, ...args]) => args);
  }
}
