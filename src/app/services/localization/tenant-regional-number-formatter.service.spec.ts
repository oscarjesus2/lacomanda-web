import { TenantRegionalNumberFormatterService } from './tenant-regional-number-formatter.service';

describe('TenantRegionalNumberFormatterService', () => {
  const formatter = new TenantRegionalNumberFormatterService();

  it('aplica punto decimal para Perú, como los comprobantes PDF', () => {
    expect(formatter.formatAmount(1234.5, 'PE')).toBe('1,234.50');
    expect(formatter.formatNumber(3.7, 'PE')).toBe('3.7');
  });

  it('aplica coma decimal para España, como los comprobantes PDF', () => {
    expect(formatter.formatAmount(1234.5, 'ES')).toBe('1.234,50');
    expect(formatter.formatNumber(3.7, 'ES')).toBe('3,7');
  });
});
