import { of } from 'rxjs';
import { DialogReportecontableComponent } from './dialog-reportecontable.component';

describe('DialogReportecontableComponent', () => {
  const dialog = { close: jasmine.createSpy('close') } as any;
  const config = { snapshot: { PaisISO2: 'ES' } } as any;
  const entradaCompra = {
    catalogos: jasmine.createSpy('catalogos').and.returnValue(of({
      Success: true,
      Data: { TiposDocumento: [
        { Id: 'FA', Descripcion: 'Factura' },
        { Id: 'FR', Descripcion: 'Factura rectificativa' },
      ] },
    })),
  } as any;
  const tiposPais = {
    GetTiposDocumentos: jasmine.createSpy('GetTiposDocumentos').and.returnValue(
      of([{ IdTipoDocumento: 1, Descripcion: 'Factura' }])),
  } as any;

  function crear(cajas: any): DialogReportecontableComponent {
    return new DialogReportecontableComponent(
      dialog,
      cajas,
      config,
      entradaCompra,
      tiposPais,
      {} as any,
      {} as any,
    );
  }

  it('reúne tipos y series reales de todas las cajas del país', async () => {
    const cajas = {
      getAllCaja: () => of({ Data: [{ IdCaja: 1 }, { IdCaja: 2 }] }),
      getTipoDocumentoByCaja: (id: number) => of(id === 1
        ? [
          { IdTipoDocumento: 1, Descripcion: 'Factura', Serie: 'F001', Activo: true },
          { IdTipoDocumento: 2, Descripcion: 'Boleta', Serie: 'B001', Activo: true },
        ]
        : [{ IdTipoDocumento: 1, Descripcion: 'Factura', Serie: 'F002', Activo: false }]),
    } as any;
    const componente = crear(cajas);

    await componente.cargarFiltros();

    expect(componente.tiposDocumento).toEqual([{ id: '1', descripcion: 'Factura' }]);
    expect(componente.seriesDisponibles).toEqual(['F001', 'F002']);
    componente.tipoDocumentoSeleccionado = '1';
    expect(componente.seriesDisponibles).toEqual(['F001', 'F002']);
    componente.serieSeleccionada = 'F001';
    componente.tipoDocumentoSeleccionado = '0';
    componente.onTipoDocumentoChange();
    expect(componente.serieSeleccionada).toBe('F001');
  });

  it('usa el catálogo de compras y no las series de ventas', async () => {
    const cajas = { getAllCaja: jasmine.createSpy('getAllCaja') } as any;
    const componente = crear(cajas);
    componente.tipoInformeSeleccionado = 'Compras';

    await componente.cargarFiltros();

    expect(componente.tiposDocumento).toEqual([
      { id: 'FA', descripcion: 'Factura' },
      { id: 'FR', descripcion: 'Factura rectificativa' },
    ]);
    expect(componente.mostrarSerie).toBeFalse();
    expect(cajas.getAllCaja).not.toHaveBeenCalled();
  });

  it('exporta ventas españolas con IVA y NIF, sin columnas SUNAT', () => {
    const componente = crear({} as any);
    componente.paisISO2 = 'ES';
    const filas = (componente as any).filasVentas([{
      Fecha: '2026-09-22', Serie: 'F001', TipoDocumento: '01',
      Documento: 'F001-1', Ruc: 'B12345678', Cliente: 'Cliente',
      Moneda: 'EUR', ValorVenta: 200, IGV: 31, OpInafecto: 0,
      Servicio: 0, ICBPER: 0, Total: 231, TotalDocumento: 231,
      DiferenciaDesglose: 0,
      DesgloseImpuestos: [
        { Tasa: 10, Base: 100, Cuota: 10 },
        { Tasa: 21, Base: 100, Cuota: 21 },
      ],
      EstadoDescripcion: 'Generado',
      EstadoSunat: 'Sin enviar', DocRef: '', FechaRef: '',
      Empresa: 'Empresa', RucEmpresa: 'A12345678',
    }]);

    expect(filas[0]['Cuota IVA']).toBe(31);
    expect(filas[0]['Base IVA 10%']).toBe(100);
    expect(filas[0]['Cuota IVA 21%']).toBe(21);
    expect(filas[0].Cuadre).toBe('OK');
    expect(filas[0]['NIF del cliente']).toBe('B12345678');
    expect(filas[0].IGV).toBeUndefined();
    expect(filas[0].EstadoSunat).toBeUndefined();
  });

  it('señala las diferencias sin ocultar el total original', () => {
    const componente = crear({} as any);
    componente.paisISO2 = 'ES';
    const filas = (componente as any).filasVentas([{
      Fecha: '2026-09-22', Serie: 'F001', TipoDocumento: '01',
      Documento: 'F001-2', Ruc: 'B12345678', Cliente: 'Cliente',
      Moneda: 'EUR', ValorVenta: 100, IGV: 21, OpInafecto: 0,
      DesgloseImpuestos: [{ Tasa: 21, Base: 100, Cuota: 21 }],
      Servicio: 0, ICBPER: 0, Total: 130, TotalDocumento: 130,
      DiferenciaDesglose: 9, EstadoDescripcion: 'Generado',
      DocRef: '', FechaRef: '', Empresa: 'Empresa', RucEmpresa: 'A12345678',
    }]);

    expect(filas[0]['Total del documento']).toBe(130);
    expect(filas[0]['Diferencia con documento']).toBe(9);
    expect(filas[0].Cuadre).toBe('REVISAR');
  });

  it('incluye fecha de recepción y estado en compras españolas', () => {
    const componente = crear({} as any);
    componente.paisISO2 = 'ES';
    const filas = (componente as any).filasCompras([{
      IdTipoDocumento: 'FA', FechaEmision: '2026-09-20',
      FechaRecepcion: '2026-09-22', EstadoDocumento: 'Anulado',
      TipoDoc: 'Factura', SerieDocm: 'F001', NoDocm: '12',
      RucCodigoCliente: 'B12345678', RazonSocial: 'Proveedor',
      Afecto: 100, IGV: 21, DesgloseImpuestos: [
        { Tasa: 21, Base: 100, Cuota: 21 },
      ], Inafecto: 0, Otros: 0, ISC: 0, Total: 121,
      DiferenciaDesglose: 0, Moneda: 'EUR', Cambio: 1,
      FechaPago: '', Referencia: '',
    }]);

    expect(filas[0]['Fecha de recepción']).toBe('2026-09-22');
    expect(filas[0]['Estado del documento']).toBe('Anulado');
    expect(filas[0]['Cuota IVA 21%']).toBe(21);
  });
});
