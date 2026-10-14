import { Injectable } from '@angular/core';

/**
 * Mantiene en el cliente la misma convención regional que los documentos PDF:
 * Perú usa punto decimal y España usa coma decimal.
 */
@Injectable({ providedIn: 'root' })
export class TenantRegionalNumberFormatterService {
  formatAmount(value: number | null | undefined, paisISO2: string | null | undefined): string {
    return this.format(value, paisISO2, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true,
    });
  }

  formatNumber(
    value: number | null | undefined,
    paisISO2: string | null | undefined,
    maximumFractionDigits = 6,
  ): string {
    return this.format(value, paisISO2, {
      maximumFractionDigits,
      useGrouping: false,
    });
  }

  private format(
    value: number | null | undefined,
    paisISO2: string | null | undefined,
    options: Intl.NumberFormatOptions,
  ): string {
    const numericValue = Number(value ?? 0);
    return new Intl.NumberFormat(
      this.resolveLocale(paisISO2),
      options,
    ).format(Number.isFinite(numericValue) ? numericValue : 0);
  }

  private resolveLocale(paisISO2: string | null | undefined): string {
    switch (paisISO2?.trim().toUpperCase()) {
      case 'PE':
        return 'es-PE';
      case 'ES':
        return 'es-ES';
      default:
        return 'en-US';
    }
  }
}
