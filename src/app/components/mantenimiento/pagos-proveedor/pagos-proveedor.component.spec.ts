import * as moment from 'moment';
import { EMPTY } from 'rxjs';
import Swal from 'sweetalert2';
import { PagosProveedorComponent } from './pagos-proveedor.component';

describe('PagosProveedorComponent: fecha y hora del pago', () => {
  it('envía el instante UTC y el desfase del día local seleccionado', () => {
    const compras = jasmine.createSpyObj('EntradaCompraService', ['registrarPagoProveedor']);
    compras.registrarPagoProveedor.and.returnValue(EMPTY);
    const componente = new PagosProveedorComponent({ idEntrada: 3 }, {} as any, compras);
    componente.compra = { IdEntrada: 3 } as any;
    componente.pago.FechaPago = moment('2026-10-23', 'YYYY-MM-DD') as any;
    componente.pago.IdTipoPago = 1;
    componente.pago.MontoPagado = 60;
    componente.horaPago = '00:30:15';

    componente.registrarPago();

    const dto = compras.registrarPagoProveedor.calls.mostRecent().args[1];
    const esperado = new Date(2026, 9, 23, 0, 30, 15);
    expect(dto.FechaPago.toISOString()).toBe(esperado.toISOString());
    expect(dto.DesfaseUtcMinutos).toBe(-esperado.getTimezoneOffset());
  });

  it('no envía el pago si falta una hora válida', () => {
    const compras = jasmine.createSpyObj('EntradaCompraService', ['registrarPagoProveedor']);
    const componente = new PagosProveedorComponent({ idEntrada: 3 }, {} as any, compras);
    componente.compra = { IdEntrada: 3 } as any;
    componente.pago.FechaPago = '2026-10-23';
    componente.pago.IdTipoPago = 1;
    componente.pago.MontoPagado = 60;
    componente.horaPago = '';
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({} as any));

    componente.registrarPago();

    expect(compras.registrarPagoProveedor).not.toHaveBeenCalled();
  });
});
