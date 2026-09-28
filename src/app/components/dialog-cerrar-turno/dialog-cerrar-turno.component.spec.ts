import { PedidoEstadoEnum } from 'src/app/enums/enum';

import { DialogCerrarTurnoComponent } from './dialog-cerrar-turno.component';

describe('DialogCerrarTurnoComponent - resolver pendientes', () => {
  function crearComponente(): DialogCerrarTurnoComponent {
    const component = Object.create(
      DialogCerrarTurnoComponent.prototype,
    ) as DialogCerrarTurnoComponent;
    component.procesando = false;
    component.dialogRef = {
      close: jasmine.createSpy('close'),
    } as any;
    return component;
  }

  const pedidoPendiente = {
    IdPedido: 10,
    NroCuenta: 1,
    NroPedido: 20,
    IdTurno: 3,
    IdEspacio: 8,
    Espacio: 'MESA 8',
    IdEmpleado: 4,
    Empleado: 'Ana',
    IdCanalVenta: 2,
    CanalVenta: 'Mesa',
    Cliente: 'Cliente',
    MontoPendiente: 80,
    FechaPedido: new Date(),
    Estado: PedidoEstadoEnum.PendienteCobro,
    EstadoDescripcion: 'Pendiente de cobro',
    EsPendienteCobro: true,
  };

  it('devuelve el pedido pendiente para cobrarlo en Ventas', () => {
    const component = crearComponente();

    component.cobrarPedidoPendiente(pedidoPendiente);

    expect(component.dialogRef.close).toHaveBeenCalledOnceWith({
      pedidoPendienteCobro: pedidoPendiente,
    });
  });

  it('no abre el cobro para un pedido activo', () => {
    const component = crearComponente();

    component.cobrarPedidoPendiente({
      ...pedidoPendiente,
      Estado: PedidoEstadoEnum.Activo,
      EstadoDescripcion: 'Activo',
      EsPendienteCobro: false,
    });

    expect(component.dialogRef.close).not.toHaveBeenCalled();
  });
});
