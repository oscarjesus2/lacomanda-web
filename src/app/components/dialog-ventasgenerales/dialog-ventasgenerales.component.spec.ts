import { DialogVentasgeneralesComponent } from './dialog-ventasgenerales.component';
import { VentasInterface } from 'src/app/interfaces/ventas.interface';

describe('DialogVentasgeneralesComponent', () => {
  let component: DialogVentasgeneralesComponent;

  beforeEach(() => {
    component = new DialogVentasgeneralesComponent(
      jasmine.createSpyObj('MatDialogRef', ['close']),
      jasmine.createSpyObj('VentaService', [
        'getListadoVentas',
        'descargarArchivoComprobante',
        'enviarComprobantePorCorreo',
        'getImpresionComprobanteVenta',
        'anularDocumentoVenta',
      ]),
      jasmine.createSpyObj('NgxSpinnerService', ['show', 'hide']),
      jasmine.createSpyObj('MatDialog', ['open']),
      jasmine.createSpyObj('TenantTextCatalogService', ['get']),
      jasmine.createSpyObj('LicenciaTenantService', [
        'obtenerEstado',
        'evaluar',
        'obtenerCuotaComprobantes',
      ]),
      { snapshot: { PaisISO2: 'PE' } } as any,
      jasmine.createSpyObj('ReprintFormatService', ['choose']),
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
