import { type CurrencyFormatOptions, formatCurrency } from './currency-formatter';
import type { RegisterElementsConfig, Scheme } from './types';

export interface Logger {
  debug(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export interface CurrencyFormatter {
  format(amount: number, currency: string): string;
}

export interface SdkContext {
  readonly environment: 'production' | 'staging' | 'sandbox';
  readonly endpoints: { readonly telemetry: string; readonly assetBase: string };
  readonly currency: CurrencyFormatter;
  readonly logger: Logger;
  readonly scheme: Scheme;
}

const ENDPOINTS: Record<SdkContext['environment'], SdkContext['endpoints']> = {
  production: { telemetry: '', assetBase: '' },
  staging: { telemetry: '', assetBase: '' },
  sandbox: { telemetry: '', assetBase: '' },
};

function makeLogger(debug: boolean): Logger {
  if (!debug) {
    const noop = () => {};
    return { debug: noop, warn: noop, error: noop };
  }

  const p = '[cg-elements]';

  return {
    debug: (...a) => console.debug(p, ...a),
    warn: (...a) => console.warn(p, ...a),
    error: (...a) => console.error(p, ...a),
  };
}

function makeCurrencyFormatter(config?: CurrencyFormatOptions): CurrencyFormatter {
  return {
    format: (amount, currency) => formatCurrency(amount, currency, config),
  };
}

export function resolveContext(config: RegisterElementsConfig): SdkContext {
  const environment = config.environment ?? 'production';

  return Object.freeze({
    environment,
    // Copy so each context owns its endpoints. ENDPOINTS is a shared module
    // table and Object.freeze is shallow, so handing out the reference would let
    // a mutation of context.endpoints corrupt every context for that environment.
    endpoints: { ...ENDPOINTS[environment] },
    currency: makeCurrencyFormatter(config.currencyConfig),
    scheme: config.scheme ?? 'light',
    logger: makeLogger(config.debug ?? false),
  });
}
