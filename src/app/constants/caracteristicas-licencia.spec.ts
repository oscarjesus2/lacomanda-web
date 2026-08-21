import {
  CARACTERISTICAS_LICENCIA,
  expandirExigencia,
} from './caracteristicas-licencia';

describe('catálogo central de características de licencia', () => {
  it('expande transitivamente la captura de documentos con IA', () => {
    const resultado = expandirExigencia(
      CARACTERISTICAS_LICENCIA.AlmacenCapturaDocumentosIa,
    );

    expect(resultado).toContain(
      CARACTERISTICAS_LICENCIA.AlmacenCapturaDocumentosIa,
    );
    expect(resultado).toContain(CARACTERISTICAS_LICENCIA.AlmacenCompras);
    expect(resultado).toContain(CARACTERISTICAS_LICENCIA.AlmacenGestion);
  });

  it('exige venta en mesa para las reservas online', () => {
    const resultado = expandirExigencia(
      CARACTERISTICAS_LICENCIA.VentasReservasOnline,
    );

    expect(resultado).toContain(CARACTERISTICAS_LICENCIA.VentasMesa);
  });

  it('no duplica características al combinar exigencias relacionadas', () => {
    const resultado = expandirExigencia([
      CARACTERISTICAS_LICENCIA.AlmacenCapturaDocumentosIa,
      CARACTERISTICAS_LICENCIA.AlmacenCompras,
    ]);

    expect(new Set(resultado).size).toBe(resultado.length);
  });
});
