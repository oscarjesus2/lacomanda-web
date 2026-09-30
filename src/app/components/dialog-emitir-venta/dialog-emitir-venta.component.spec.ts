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
      { show: jasmine.createSpy(), hide: jasmine.createSpy() } as any,
      { get: (key: string) => key } as any,
    );

    return { component, dialog, cajaService };
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
});
