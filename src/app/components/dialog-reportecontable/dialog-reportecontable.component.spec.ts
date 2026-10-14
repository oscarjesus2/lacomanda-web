import { of } from 'rxjs';
import { DialogReportecontableComponent } from './dialog-reportecontable.component';
import { TenantRegionalNumberFormatterService } from 'src/app/services/localization/tenant-regional-number-formatter.service';

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
      of([
        { IdTipoDocumento: 1, Descripcion: 'Factura', EsFiscal: true },
        { IdTipoDocumento: 9, Descripcion: 'Express', EsFiscal: false },
      ])),
  } as any;
  const tarjetas = {
    getTarjeta: jasmine.createSpy('getTarjeta').and.returnValue(of([
      { IdTarjeta: 1, Descripcion: 'Visa', Orden: 1 },
      { IdTarjeta: 2, Descripcion: 'Mastercard', Orden: 2 },
      { IdTarjeta: 3, Descripcion: 'American Express', Orden: 3 },
    ])),
  } as any;
  const monedas = {
    getMoneda: jasmine.createSpy('getMoneda').and.returnValue(of({
      Success: true,
      Data: [
        { IdMoneda: 'PEN', Descripcion: 'Soles' },
        { IdMoneda: 'USD', Descripcion: 'Dólares' },
      ],
    })),
  } as any;

  function crear(cajas: any): DialogReportecontableComponent {
    return new DialogReportecontableComponent(
      dialog,
      cajas,
      config,
      entradaCompra,
      tiposPais,
      tarjetas,
      monedas,
      {} as any,
      {} as any,
      new TenantRegionalNumberFormatterService(),
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

  it('oculta Express y su serie aunque esté configurado en una caja', async () => {
    const cajas = {
      getAllCaja: () => of({ Data: [{ IdCaja: 1 }] }),
      getTipoDocumentoByCaja: () => of([
        { IdTipoDocumento: 1, Descripcion: 'Factura', Serie: 'F001' },
        { IdTipoDocumento: 9, Descripcion: 'Express', Serie: 'E001' },
      ]),
    } as any;
    const componente = crear(cajas);

    await componente.cargarFiltros();

    expect(componente.tiposDocumento).toEqual([
      { id: '1', descripcion: 'Factura' },
    ]);
    expect(componente.seriesDisponibles).toEqual(['F001']);
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

    expect(filas[0]['IVA 10%']).toBe('10,00');
    expect(filas[0]['IVA 21%']).toBe('21,00');
    expect(filas[0]['Cuadre tributario']).toBe('OK');
    expect(filas[0]['NIF del cliente']).toBe('B12345678');
    expect(filas[0]['Cuota IVA']).toBeUndefined();
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

    expect(filas[0]['Total del documento']).toBe('130,00');
    expect(filas[0]['Diferencia con documento']).toBe('9,00');
    expect(filas[0]['Cuadre tributario']).toBe('REVISAR');
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
    expect(filas[0]['IVA 21%']).toBe('21,00');
  });

  it('reemplaza el IGV genérico por una columna dinámica por tasa en Perú', () => {
    const componente = crear({} as any);
    componente.paisISO2 = 'PE';
    const filas = (componente as any).filasVentas([{
      Fecha: '2026-09-22', Serie: 'F001', TipoDocumento: '01',
      Documento: 'F001-3', Ruc: '20123456789', Cliente: 'Cliente',
      Moneda: 'PEN', ValorVenta: 100, IGV: 18, OpInafecto: 0,
      Servicio: 0, ICBPER: 0, Total: 118, TotalDocumento: 118,
      DiferenciaDesglose: 0,
      DesgloseImpuestos: [{ Tasa: 18, Base: 100, Cuota: 18 }],
      EstadoDescripcion: 'Generado', EstadoSunat: 'Aceptado',
      DocRef: '', FechaRef: '', Empresa: 'Empresa', RucEmpresa: '20123456789',
    }]);

    expect(filas[0].ValorVenta).toBe('100.00');
    expect(filas[0].IGV).toBeUndefined();
    expect(filas[0]['IGV 18%']).toBe('18.00');
    expect(filas[0]['Base IGV 18%']).toBeUndefined();
    expect(filas[0]['Cuota IGV 18%']).toBeUndefined();
    expect(filas[0].ICBPER).toBeUndefined();
    expect(Object.keys(filas[0]).indexOf('IGV 18%')).toBe(
      Object.keys(filas[0]).indexOf('ValorVenta') + 1,
    );
  });

  it('incluye un impuesto fijo únicamente si alguna venta del período lo tiene', () => {
    const componente = crear({} as any);
    componente.paisISO2 = 'PE';
    const filas = (componente as any).filasVentas([
      {
        IdVenta: 1, ValorVenta: 100, IGV: 18, ICBPER: 0,
        DesgloseImpuestos: [{ Tasa: 18, Base: 100, Cuota: 18 }],
        Pagos: [], TotalCobrado: 0, Propinas: 0,
        DiferenciaCobro: 0, DiferenciaDesglose: 0,
      },
      {
        IdVenta: 2, ValorVenta: 100, IGV: 18, ICBPER: 0.3,
        DesgloseImpuestos: [{ Tasa: 18, Base: 100, Cuota: 18 }],
        Pagos: [], TotalCobrado: 0, Propinas: 0,
        DiferenciaCobro: 0, DiferenciaDesglose: 0,
      },
    ]);

    expect(filas[0].ICBPER).toBe('0.00');
    expect(filas[1].ICBPER).toBe('0.30');
  });

  it('omite una tasa tributaria cuando no tiene importe en el período', () => {
    const componente = crear({} as any);
    componente.paisISO2 = 'PE';
    const filas = (componente as any).filasVentas([{
      IdVenta: 1, ValorVenta: 100, IGV: 0, ICBPER: 0,
      DesgloseImpuestos: [{ Tasa: 18, Base: 100, Cuota: 0 }],
      Pagos: [], TotalCobrado: 0, Propinas: 0,
      DiferenciaCobro: 0, DiferenciaDesglose: 0,
    }]);

    expect(filas[0]['IGV 18%']).toBeUndefined();
  });

  it('aplica el mismo desglose dinámico en compras peruanas', () => {
    const componente = crear({} as any);
    componente.paisISO2 = 'PE';
    const filas = (componente as any).filasCompras([{
      IdTipoDocumento: '01', FechaEmision: '2026-09-22',
      FechaRecepcion: '2026-09-22', EstadoDocumento: 'Generado',
      TipoDoc: 'Factura', SerieDocm: 'F001', NoDocm: '3',
      RucCodigoCliente: '20123456789', RazonSocial: 'Proveedor',
      Afecto: 100, IGV: 18, PorcentajeIGV: 18,
      DesgloseImpuestos: [{ Tasa: 18, Base: 100, Cuota: 18 }],
      Inafecto: 0, Otros: 0, ISC: 0, Total: 118,
      DiferenciaDesglose: 0, Moneda: 'PEN', Cambio: 1,
      FechaPago: '', Referencia: '',
    }]);

    expect(filas[0].Afecto).toBe('100.00');
    expect(filas[0].IGV).toBeUndefined();
    expect(filas[0].PorcentajeIGV).toBeUndefined();
    expect(filas[0]['IGV 18%']).toBe('18.00');
    expect(filas[0]['Otros impuestos']).toBeUndefined();
    expect(filas[0].ISC).toBeUndefined();
    expect(Object.keys(filas[0]).indexOf('IGV 18%')).toBe(
      Object.keys(filas[0]).indexOf('Afecto') + 1,
    );
  });

  it('incluye solo los impuestos adicionales presentes en compras', () => {
    const componente = crear({} as any);
    componente.paisISO2 = 'PE';
    const filas = (componente as any).filasCompras([
      {
        Afecto: 100, IGV: 18, PorcentajeIGV: 18,
        DesgloseImpuestos: [{ Tasa: 18, Base: 100, Cuota: 18 }],
        Inafecto: 0, Otros: 0, ISC: 0, Total: 118,
        DiferenciaDesglose: 0,
      },
      {
        Afecto: 100, IGV: 18, PorcentajeIGV: 18,
        DesgloseImpuestos: [{ Tasa: 18, Base: 100, Cuota: 18 }],
        Inafecto: 0, Otros: 0.3, ISC: 2, Total: 120.3,
        DiferenciaDesglose: 0,
      },
    ]);

    expect(filas[0]['Otros impuestos']).toBe('0.00');
    expect(filas[0].ISC).toBe('0.00');
    expect(filas[1]['Otros impuestos']).toBe('0.30');
    expect(filas[1].ISC).toBe('2.00');
  });

  it('distribuye cobros peruanos por banco, moneda, efectivo y tarjeta', () => {
    const componente = crear({} as any);
    componente.paisISO2 = 'PE';
    componente.monedasCobro = [
      { IdMoneda: 'PEN', Descripcion: 'Soles' },
      { IdMoneda: 'USD', Descripcion: 'Dólares' },
    ] as any;
    componente.tarjetas = [
      { IdTarjeta: 1, Descripcion: 'Visa', Orden: 1 },
      { IdTarjeta: 2, Descripcion: 'Mastercard', Orden: 2 },
      { IdTarjeta: 3, Descripcion: 'American Express', Orden: 3 },
    ] as any;

    const columnas = (componente as any).columnasPagos(
      [{
        IdTipoPago: 6,
        FormaPago: 'Depósito',
        IdMoneda: 'PEN',
        MonedaDescripcion: 'Soles',
        MontoRecibido: 30,
        MontoEquivalente: 30,
        TipoCambio: 1,
        Propina: 0,
        NumeroOperacion: 'OP-123',
        BancoDestino: 'Banco de prueba',
        BancoMoneda: 'PEN',
        BancoMonedaDescripcion: 'Soles',
      }, {
        IdTipoPago: 1,
        FormaPago: 'Efectivo',
        IdMoneda: 'USD',
        MonedaDescripcion: 'Dólares',
        MontoRecibido: 10,
        MontoEquivalente: 37,
        TipoCambio: 3.7,
        Propina: 0,
      }, {
        IdTipoPago: 3,
        IdTarjeta: 1,
        Tarjeta: 'Visa',
        FormaPago: 'Tarjeta',
        IdMoneda: 'PEN',
        MonedaDescripcion: 'Soles',
        MontoRecibido: 20,
        MontoEquivalente: 20,
        TipoCambio: 1,
        Propina: 2,
      }],
      'PEN',
    );

    expect(columnas.FormaPago).toBe('Depósito | Efectivo | Tarjeta');
    expect(columnas.Banco)
      .toBe('Banco de prueba - Soles');
    expect(columnas['N.º de operación'])
      .toBe('OP-123');
    expect(columnas['Monto bancario Soles']).toBe(30);
    expect(columnas['Monto bancario Dólares']).toBe(0);
    expect(columnas['Soles Efectivo']).toBe(0);
    expect(columnas['Dólares Efectivo']).toBe(10);
    expect(columnas['Tipo de cambio']).toBe('3.7');
    expect(columnas.Equivalente).toBe(37);
    expect(columnas.Visa).toBe(20);
    expect(columnas.Mastercard).toBe(0);
    expect(columnas['American Express']).toBe(0);
    expect(columnas.Propina).toBe(2);
  });

  it('usa el bloque de pagos español sin columnas por moneda ni tipo de cambio', () => {
    const componente = crear({} as any);
    componente.paisISO2 = 'ES';
    componente.tarjetas = [{ IdTarjeta: 1, Descripcion: 'Visa', Orden: 1 }] as any;

    const columnas = (componente as any).columnasPagos([{
      IdTipoPago: 6,
      FormaPago: 'Transferencia',
      IdMoneda: 'EUR',
      MonedaDescripcion: 'Euro',
      MontoRecibido: 100,
      MontoEquivalente: 100,
      TipoCambio: 1,
      Propina: 0,
      NumeroOperacion: 'ES-1',
      BancoDestino: 'Banco de prueba',
      BancoMonedaDescripcion: 'Euro',
    }], 'EUR');

    expect(Object.keys(columnas)).toEqual([
      'FormaPago', 'Banco', 'N.º de operación', 'Monto bancario', 'Efectivo', 'Visa', 'Propina',
    ]);
    expect(columnas['Monto bancario']).toBe(100);
    expect(columnas['Tipo de cambio']).toBeUndefined();
    expect(columnas.Equivalente).toBeUndefined();
  });

  it('ubica todo el bloque de pagos inmediatamente después de DirecEmpresa', () => {
    const componente = crear({} as any);
    componente.paisISO2 = 'PE';
    componente.monedasCobro = [
      { IdMoneda: 'PEN', Descripcion: 'Soles' },
      { IdMoneda: 'USD', Descripcion: 'Dólares' },
    ] as any;
    componente.tarjetas = [{ IdTarjeta: 1, Descripcion: 'Visa', Orden: 1 }] as any;

    const fila = (componente as any).filasVentas([{
      IdVenta: 1,
      Fecha: '2026-10-14',
      Serie: 'F001',
      TipoDocumento: '01',
      Documento: 'F001-1',
      Ruc: '20123456789',
      Cliente: 'Cliente',
      Moneda: 'Soles',
      IdMoneda: 'PEN',
      OpInafecto: 0,
      ValorVenta: 100,
      IGV: 18,
      Servicio: 0,
      ICBPER: 0,
      Total: 118,
      TotalDocumento: 118,
      DiferenciaDesglose: 0,
      Pagos: [],
      DesgloseImpuestos: [{ Tasa: 18, Base: 100, Cuota: 18 }],
      EstadoDescripcion: 'Generado',
      EstadoSunat: 'Aceptado',
      DocRef: '',
      FechaRef: '',
      Empresa: 'Empresa',
      RucEmpresa: '20123456789',
      DirecEmpresa: 'Dirección',
    }])[0];

    const columnas = Object.keys(fila);
    expect(columnas.slice(columnas.indexOf('DirecEmpresa') + 1)).toEqual([
      'FormaPago',
      'Banco',
      'N.º de operación',
      'Monto bancario Soles',
      'Monto bancario Dólares',
      'Soles Efectivo',
      'Dólares Efectivo',
      'Tipo de cambio',
      'Equivalente',
      'Visa',
      'Propina',
    ]);
  });
});
