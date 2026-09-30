import { DialogVentasgeneralesComponent } from './dialog-ventasgenerales.component';
import { VentasInterface } from 'src/app/interfaces/ventas.interface';
import { of } from 'rxjs';

describe('DialogVentasgeneralesComponent', () => {
  let component: DialogVentasgeneralesComponent;
  let ventaService: jasmine.SpyObj<any>;
  let spinner: jasmine.SpyObj<any>;
  let reprintFormat: jasmine.SpyObj<any>;

  beforeEach(() => {
    ventaService = jasmine.createSpyObj('VentaService', [
      'getListadoVentas',
      'descargarArchivoComprobante',
      'enviarComprobantePorCorreo',
      'getImpresionComprobanteVenta',
      'anularDocumentoVenta',
    ]);
    spinner = jasmine.createSpyObj('NgxSpinnerService', ['show', 'hide']);
    reprintFormat = jasmine.createSpyObj('ReprintFormatService', ['choose']);
    component = new DialogVentasgeneralesComponent(
      jasmine.createSpyObj('MatDialogRef', ['close']),
      ventaService,
      spinner,
      jasmine.createSpyObj('MatDialog', ['open']),
      jasmine.createSpyObj('TenantTextCatalogService', ['get']),
      jasmine.createSpyObj('LicenciaTenantService', [
        'obtenerEstado',
        'evaluar',
        'obtenerCuotaComprobantes',
      ]),
      { snapshot: { PaisISO2: 'PE' } } as any,
      reprintFormat,
      { getCurrentUser: () => ({ IdNivel: 1 }) } as any,
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('inicia el rango en la fecha local actual', () => {
    const hoy = new Date();
    const esperado = [
      hoy.getFullYear(),
      String(hoy.getMonth() + 1).padStart(2, '0'),
      String(hoy.getDate()).padStart(2, '0'),
    ].join('-');

    expect(component.fechaDesde).toBe(esperado);
    expect(component.fechaHasta).toBe(esperado);
  });

  it('solo permite anular un documento vigente', () => {
    expect(component.esDocumentoActivo(venta({ Estado: 1 }))).toBeTrue();
    expect(component.esDocumentoActivo(venta({ Estado: 2 }))).toBeFalse();
    expect(component.esDocumentoActivo(null)).toBeFalse();
  });

  it('valida el correo del cliente antes de habilitar el envío', () => {
    expect(component.tieneCorreoValido(
      venta({ ClienteCorreo: 'cliente@ejemplo.com' }))).toBeTrue();
    expect(component.tieneCorreoValido(
      venta({ ClienteCorreo: 'sin-arroba' }))).toBeFalse();
    expect(component.tieneCorreoValido(
      venta({ ClienteCorreo: null }))).toBeFalse();
  });

  it('filtra por texto, tipo de documento y caja', () => {
    component.ventas = [
      venta({
        IdVenta: 1,
        Documento: 'F001-101',
        Cliente: 'Restaurante Uno',
        TipoDocumento: 'Factura',
        Caja: 'Caja principal',
      }),
      venta({
        IdVenta: 2,
        Documento: 'B001-202',
        Cliente: 'Cliente Varios',
        TipoDocumento: 'Boleta',
        Caja: 'Caja terraza',
      }),
    ];
    component.textoFiltro = 'restaurante';
    component.tipoDocumentoSeleccionado = 'Factura';
    component.cajaSeleccionada = 'Caja principal';

    component.aplicarFiltro();

    expect(component.dataSource.data.map(item => item.IdVenta)).toEqual([1]);
  });

  it('reconoce estados fiscales que requieren atención', () => {
    component.dataSource.data = [
      venta({ IdVenta: 1, EstadoFiscal: 2 }),
      venta({ IdVenta: 2, EstadoFiscal: 7 }),
      venta({ IdVenta: 3, EstadoFiscal: 3 }),
    ];

    expect(component.totalAtencionFiscal).toBe(2);
    expect(component.claseEstadoFiscal(component.dataSource.data[0]))
      .toBe('danger');
    expect(component.claseEstadoFiscal(component.dataSource.data[2]))
      .toBe('success');
  });

  it('no descarga el PDF cuando se cancela la selección de formato', async () => {
    component.ventaSeleccionada = venta();
    reprintFormat.choose.and.resolveTo(null);

    await component.descargarArchivo('pdf');

    expect(ventaService.getImpresionComprobanteVenta).not.toHaveBeenCalled();
    expect(spinner.show).not.toHaveBeenCalled();
  });

  it('descarga la representación A4 seleccionada', async () => {
    component.ventaSeleccionada = venta({ IdVenta: 19, Documento: 'F001-19' });
    reprintFormat.choose.and.resolveTo(2);
    ventaService.getImpresionComprobanteVenta.and.returnValue(of({
      Success: true,
      Message: 'ok',
      Data: [{ Documento: 'JVBERg==' }],
    }));
    const enlace = jasmine.createSpyObj('HTMLAnchorElement', ['click']);
    spyOn(document, 'createElement').and.returnValue(enlace as HTMLAnchorElement);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:pdf');
    spyOn(URL, 'revokeObjectURL');

    await component.descargarArchivo('pdf');

    expect(ventaService.getImpresionComprobanteVenta).toHaveBeenCalledWith(19, 2);
    expect(enlace.download).toBe('F001-19-A4.pdf');
    expect(enlace.click).toHaveBeenCalled();
    expect(spinner.hide).toHaveBeenCalled();
  });

  it('mantiene la descarga XML sin solicitar formato de impresión', async () => {
    component.ventaSeleccionada = venta({ IdVenta: 20, Documento: 'F001-20' });
    ventaService.descargarArchivoComprobante.and.returnValue(
      of(new Blob(['xml'], { type: 'application/xml' })),
    );
    const enlace = jasmine.createSpyObj('HTMLAnchorElement', ['click']);
    spyOn(document, 'createElement').and.returnValue(enlace as HTMLAnchorElement);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:xml');
    spyOn(URL, 'revokeObjectURL');

    await component.descargarArchivo('xml');

    expect(reprintFormat.choose).not.toHaveBeenCalled();
    expect(ventaService.descargarArchivoComprobante).toHaveBeenCalledWith(20, 'xml');
    expect(enlace.download).toBe('F001-20.xml');
  });

  function venta(
    cambios: Partial<VentasInterface> = {},
  ): VentasInterface {
    return {
      IdVenta: 1,
      IdCaja: 1,
      Caja: 'Caja principal',
      TipoDocumento: 'Factura',
      Documento: 'F001-1',
      Cliente: 'Cliente',
      NumeroIdentificacion: '12345678',
      ClienteCorreo: 'cliente@ejemplo.com',
      FechaVenta: '2026-09-21',
      Moneda: 'PEN',
      Dscto: 0,
      Total: 100,
      IdTurno: 1,
      EstadoDescripcion: 'Generado',
      Estado: 1,
      EstadoFiscal: 3,
      EstadoFiscalDescripcion: 'Aceptado',
      NombreArchivo: 'F001-1',
      EstadoPago: 'Pagado',
      IdCanalVenta: 1,
      ...cambios,
    };
  }
});
