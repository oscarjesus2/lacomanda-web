import { of } from 'rxjs';
import Swal from 'sweetalert2';

import { EnumTipoDocumento } from 'src/app/enums/enum';
import { DialogEmitirVentaComponent, ProductElement } from './dialog-emitir-venta.component';

describe('DialogEmitirVentaComponent - caja y turno', () => {
  function crear() {
    const dialogRef = { close: jasmine.createSpy('close') };
    const comprobanteRef = { afterClosed: () => of(null) };
    const dialog = {
      open: jasmine.createSpy('open').and.returnValue(comprobanteRef),
    };
    const cajaService = {
      getAllCaja: jasmine.createSpy('getAllCaja').and.returnValue(of({
        Data: [],
      })),
    };
    const configuracionService = {
      snapshot: {
        IdMoneda: 'PEN',
        CodigoISO4217: 'PEN',
        SimboloMoneda: 'S/',
      },
      get: jasmine.createSpy('get').and.returnValue(of({
        IdMoneda: 'PEN',
        CodigoISO4217: 'PEN',
        SimboloMoneda: 'S/',
      })),
    };
    const component = new DialogEmitirVentaComponent(
      dialogRef as any,
      dialog as any,
      {
        getCurrentUser: () => ({ IdEmpleado: 4 }),
        getCurrentSession: () => ({ User: { IdUsuario: 8 } }),
        getCurrentIP: () => '127.0.0.1',
      } as any,
      cajaService as any,
      { listarProductos: () => of({ Data: [] }) } as any,
      configuracionService as any,
      { show: jasmine.createSpy(), hide: jasmine.createSpy() } as any,
      { get: (key: string) => key } as any,
    );

    return { component, dialog, cajaService, configuracionService };
  }

  function caja(
    idCaja: number,
    turno?: { IdTurno: number; TipoCambio: number; TipoCambioVenta: number },
    porDefecto = false,
  ): any {
    return {
      IdCaja: idCaja,
      Descripcion: `Caja ${idCaja}`,
      Activo: true,
      CajaPorDefecto: porDefecto,
      TurnoAbierto: turno,
    };
  }

  it('prioriza una caja predeterminada con turno abierto', async () => {
    const { component, cajaService } = crear();
    cajaService.getAllCaja.and.returnValue(of({
      Data: [
        caja(1, undefined, true),
        caja(2, { IdTurno: 20, TipoCambio: 3.7, TipoCambioVenta: 3.8 }, true),
      ],
    }));

    await (component as any).initializeCaja();

    expect(component.cajaSeleccionada).toBe(2);
    expect(component.tipoCambioCompra).toBe('3.7');
    expect(component.tipoCambioVenta).toBe('3.8');
  });

  it('inicializa moneda, caja y catálogo en una sola apertura', async () => {
    const { component, cajaService } = crear();
    cajaService.getAllCaja.and.returnValue(of({
      Data: [
        caja(2, { IdTurno: 20, TipoCambio: 3.7, TipoCambioVenta: 3.8 }, true),
      ],
    }));

    await component.ngOnInit();

    expect(component.monedaSeleccionada).toBe('PEN');
    expect(component.cajaSeleccionada).toBe(2);
    expect(component.products).toEqual([]);
  });

  it('no permite vender cuando la caja seleccionada no tiene turno abierto', () => {
    const { component, dialog } = crear();
    component.listCaja = [caja(1, undefined, true)];
    component.onCajaSeleccionada(1);
    component.form = { controls: {}, valid: true } as any;
    const alert = spyOn(Swal, 'fire');

    component.OpenDialogEmitirComprobante(EnumTipoDocumento.BoletaVenta);

    expect(alert).toHaveBeenCalled();
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('envía la caja y el turno elegidos al comprobante', () => {
    const { component, dialog } = crear();
    component.listCaja = [
      caja(7, { IdTurno: 33, TipoCambio: 3.7, TipoCambioVenta: 3.8 }, true),
    ];
    component.onCajaSeleccionada(7);
    component.form = { controls: {}, valid: true } as any;
    component.dataSource.data = [{
      IdProducto: 10,
      Producto: 'Producto',
      Qty: 1,
      Precio: 25,
      Total: 25,
      Moneda: 'SOL',
      CodDscto: '',
      MontoDscto: 0,
      NroCupon: '',
      Tipo: 0,
      ExclusivoParaAnfitriona: false,
      PermitirParaTragoCortesia: false,
      Impuestos: [],
    } satisfies ProductElement];
    component.calcularTotales();

    component.OpenDialogEmitirComprobante(EnumTipoDocumento.BoletaVenta);

    expect(dialog.open).toHaveBeenCalled();
    const config = dialog.open.calls.mostRecent().args[1] as any;
    expect(config.data.idCaja).toBe(7);
    expect(config.data.idTurno).toBe(33);
    expect(config.data.bTurnoIndenpendiente).toBeTrue();
    expect(config.data.pedidoCab.IdCaja).toBe(7);
    expect(config.data.pedidoCab.IdTurno).toBe(33);
  });

  it('desglosa el impuesto incluido sin alterar el total cobrado', () => {
    const { component } = crear();
    component.dataSource.data = [{
      IdProducto: 10,
      Producto: 'Producto con IGV',
      Qty: 1,
      Precio: 118,
      Total: 118,
      Moneda: 'PEN',
      CodDscto: '',
      MontoDscto: 0,
      NroCupon: '',
      Tipo: 0,
      ExclusivoParaAnfitriona: false,
      PermitirParaTragoCortesia: false,
      Impuestos: [{
        IdImpuestoPais: 'IGV18',
        Tasa: 0.18,
        FijoPorUnidad: 0,
      }],
    }];

    component.calcularTotales();

    expect(component.sumaSubtotal).toBe(100);
    expect(component.sumaImpuestos).toBe(18);
    expect(component.sumaTotal).toBe(118);
  });

  it('agrega un producto con su moneda e impuestos y actualiza el resumen', () => {
    const { component } = crear();

    component.AgregarItemGrid({
      IdProducto: 21,
      NombreCorto: 'Producto gravado',
      Precio: 118,
      SinPrecio: false,
      IdMoneda: 'SOLES',
      Tipo: 0,
      ExclusivoParaAnfitriona: false,
      PermitirParaTragoCortesia: false,
      Impuestos: [{
        IdImpuestoPais: 'IGV18',
        Tasa: 0.18,
        FijoPorUnidad: 0,
      }],
    });

    const linea = component.dataSource.data[0];
    expect(linea.IdProducto).toBe(21);
    expect(linea.Moneda).toBe('PEN');
    expect(linea.Impuestos[0].IdImpuestoPais).toBe('IGV18');
    expect(component.sumaSubtotal).toBe(100);
    expect(component.sumaImpuestos).toBe(18);
    expect(component.sumaTotal).toBe(118);
  });

  it('elimina visualmente la línea completa y recalcula el resumen', () => {
    const { component } = crear();
    const linea = {
      IdProducto: 10,
      Producto: 'Producto',
      Qty: 2,
      Precio: 25,
      Total: 50,
      Moneda: 'PEN',
      CodDscto: '',
      MontoDscto: 0,
      NroCupon: '',
      Tipo: 0,
      ExclusivoParaAnfitriona: false,
      PermitirParaTragoCortesia: false,
      Impuestos: [],
    } satisfies ProductElement;
    component.dataSource.data = [linea];

    component.eliminarProductGrid(linea);

    expect(component.dataSource.data).toEqual([]);
    expect(component.sumaTotal).toBe(0);
  });

  it('aumenta y disminuye la cantidad sin ocultar la acción de eliminar', () => {
    const { component } = crear();
    const linea = {
      IdProducto: 10,
      Producto: 'Producto',
      Qty: 2,
      Precio: 25,
      Total: 50,
      Moneda: 'PEN',
      CodDscto: '',
      MontoDscto: 0,
      NroCupon: '',
      Tipo: 0,
      ExclusivoParaAnfitriona: false,
      PermitirParaTragoCortesia: false,
      Impuestos: [],
    } satisfies ProductElement;
    component.dataSource.data = [linea];

    component.aumentarProductGrid(linea);
    expect(linea.Qty).toBe(3);
    expect(linea.Total).toBe(75);

    component.restarProductGrid(linea);
    expect(linea.Qty).toBe(2);
    expect(linea.Total).toBe(50);
    expect(component.dataSource.data).toEqual([linea]);
  });

  it('identifica PEN como soles y no como dólares al pedir el precio', () => {
    const { component, dialog } = crear();

    component.abrirDialogoCantidad({
      IdProducto: 10,
      NombreCorto: 'Producto sin precio',
      Precio: 0,
      SinPrecio: true,
      IdMoneda: 'PEN',
      Tipo: 0,
      ExclusivoParaAnfitriona: false,
      PermitirParaTragoCortesia: false,
      Impuestos: [],
    });

    const config = dialog.open.calls.mostRecent().args[1] as any;
    expect(config.data.title).toBe('Precio del producto · S/ PEN');
  });

  it('muestra el símbolo correspondiente cuando el producto usa otra moneda', () => {
    const { component, dialog } = crear();

    component.abrirDialogoCantidad({
      IdProducto: 11,
      NombreCorto: 'Producto en euros',
      Precio: 0,
      SinPrecio: true,
      IdMoneda: 'EUROS',
      Tipo: 0,
      ExclusivoParaAnfitriona: false,
      PermitirParaTragoCortesia: false,
      Impuestos: [],
    });

    const config = dialog.open.calls.mostRecent().args[1] as any;
    expect(config.data.title).toBe('Precio del producto · € EUR');
  });

  it('carga la moneda configurada por el tenant', async () => {
    const { component, configuracionService } = crear();
    configuracionService.snapshot = {
      IdMoneda: 'EURO',
      CodigoISO4217: 'EUR',
      SimboloMoneda: '€',
    };

    await (component as any).initializeMoneda();

    expect(component.monedaSeleccionada).toBe('EUR');
    expect(component.simboloMoneda).toBe('€');
    expect(configuracionService.get).not.toHaveBeenCalled();
  });

  it('convierte los códigos monetarios heredados antes de aplicar el tipo de cambio', () => {
    const { component } = crear();
    const producto = {
      IdProducto: 10,
      NombreCorto: 'Producto',
      Precio: 0,
      SinPrecio: true,
      IdMoneda: 'SOL',
      Tipo: 0,
      ExclusivoParaAnfitriona: false,
      PermitirParaTragoCortesia: false,
      Impuestos: [],
    };
    component.monedaSeleccionada = 'USD';
    component.tipoCambioCompra = '4';

    component.actualizarPrecioProducto(producto, { value: '40' });

    expect(producto.Precio).toBe(10);

    producto.IdMoneda = 'DOL';
    component.monedaSeleccionada = 'PEN';
    component.tipoCambioVenta = '3.8';
    component.actualizarPrecioProducto(producto, { value: '10' });
    expect(producto.Precio).toBe(38);
  });

  it('incluye los impuestos fijos dentro del desglose sin sumarlos otra vez al total', () => {
    const { component } = crear();
    component.dataSource.data = [{
      IdProducto: 10,
      Producto: 'Producto con impuesto fijo',
      Qty: 2,
      Precio: 5,
      Total: 10,
      Moneda: 'PEN',
      CodDscto: '',
      MontoDscto: 0,
      NroCupon: '',
      Tipo: 0,
      ExclusivoParaAnfitriona: false,
      PermitirParaTragoCortesia: false,
      Impuestos: [{
        IdImpuestoPais: 'FIJO',
        Tasa: 0,
        FijoPorUnidad: 0.5,
      }],
    }];

    component.calcularTotales();

    expect(component.sumaSubtotal).toBe(9);
    expect(component.sumaImpuestos).toBe(1);
    expect(component.sumaTotal).toBe(10);
  });
});
