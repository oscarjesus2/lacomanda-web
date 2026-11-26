import { of, throwError } from 'rxjs';
import { DialogDividirCuentaComponent } from '../../components/dialog-dividir-cuenta/dialog-dividir-cuenta.component';
import { CanalVentaEnum } from '../../enums/enum';
import { PedidoDet } from '../../models/pedidodet.models';
import { Producto } from '../../models/product.models';
import { Notificar } from '../../shared/notificaciones';
import { VentaComponent } from './venta.component';

describe('VentaComponent - enviar la comanda desde la caja local', () => {
  function crearVenta() {
    const sesionLocal = {
      usuario: { IdUsuario: 17, IdEmpleado: 31 }, contexto: { idEstacion: 8, identificadorEstacion: 'estacion-A' },
      registrarOperacion: jasmine.createSpy('registrarOperacion').and.resolveTo({ resultado: 'registrada' }),
    };
    const linea = new PedidoDet({
      Item: 0, Cantidad: 2, Precio: 5.25, Subtotal: 10.5, Producto: new Producto({ IdProducto: 4 }),
      Observacion: 'Sin sal', PedidoComplemento: [], PedidoMenu: [],
    });
    const venta = Object.assign(Object.create(VentaComponent.prototype), {
      sesionLocal, listProductGrid: [linea], espacioSelected: { IdEspacio: 6, NroPersonas: 2 },
      idCanalVentaSelected: CanalVentaEnum.ESPACIO, canalVentaEnum: CanalVentaEnum, mozoSelected: {},
      turnoAbierto: { IdCaja: 3, IdTurno: 12 }, DEFAULT_ID: 0, idPedidoCobrar: 0, nroCuentaCobrar: 0,
      deviceCapabilities: { requiresLocalPrintBridge: () => false }, spinnerService: { show() {}, hide() {} },
      storageService: { getCurrentIP: () => 'identificador-online' },
      RehacerPantalla: jasmine.createSpy('regresar al tablero'), pedidoService: { GrabarPedido: jasmine.createSpy('nube') },
    });
    Object.defineProperty(venta, 'modoCajaLocal', { value: true, configurable: true });
    return { venta, linea, sesionLocal };
  }

  it('crea una mesa desde Enviar pedido con su estación, usuario local, cantidades y observaciones', async () => {
    const { venta, sesionLocal } = crearVenta();
    await venta.EnviarPedido();

    const [ruta, datos] = sesionLocal.registrarOperacion.calls.mostRecent().args;
    expect(ruta).toBe('pedidos');
    expect(datos.pedido).toEqual(jasmine.objectContaining({
      IdEmpleado: 31, UsuReg: 17, IdEspacio: 6, IdCaja: 3, IdTurno: 12, NroCuenta: 1, NroPax: 2, Total: 10.5,
    }));
    expect(datos.pedido.ListaPedidoDet[0]).toEqual(jasmine.objectContaining({
      Cantidad: 2, Precio: 5.25, Observacion: 'Sin sal', IdPedido: 0, Ip: 'estacion-A', IdEstacion: 8,
    }));
    expect(venta.RehacerPantalla).toHaveBeenCalledTimes(1);
    expect(venta.pedidoService.GrabarPedido).not.toHaveBeenCalled();
  });

  it('al ampliar una cuenta envía solo los ítems nuevos con la referencia y la versión leídas', async () => {
    const { venta, linea, sesionLocal } = crearVenta();
    venta.cuentaLocalSeleccionada = { identificador: 'ONLINE-18-2', version: 4, contenido: { NroCuenta: 2 } };
    venta.idPedidoCobrar = 18;
    venta.listProductGrid.unshift(new PedidoDet({ ...linea, Item: 9, NumEnvios: 0 }));
    linea.PedidoComplemento = [{ ProductoComplemento: { IdProducto: 42, FactorComplemento: 1 }, Cantidad: 1 }] as any;
    await venta.EnviarPedido();

    const [ruta, datos] = sesionLocal.registrarOperacion.calls.mostRecent().args;
    expect(ruta).toBe('pedidos/modificar');
    expect(datos).toEqual(jasmine.objectContaining({ accion: 'agregar-productos', referenciaPedido: 'ONLINE-18-2', versionPedido: 4 }));
    expect(datos.detalles.length).toBe(1);
    expect(datos.detalles[0].NroCuenta).toBe(2);
    expect(datos.detalles[0].PedidoComplemento[0].IdProdComple).toBe(42);
    expect(venta.pedidoService.GrabarPedido).not.toHaveBeenCalled();
  });

  it('conserva el borrador si falla el guardado y libera el botón para reintentar', async () => {
    const { venta, sesionLocal, linea } = crearVenta();
    sesionLocal.registrarOperacion.and.rejectWith(new Error('La cuenta ha cambiado.'));
    const aviso = spyOn(Notificar, 'error');
    await venta.EnviarPedido();

    expect(venta.RehacerPantalla).not.toHaveBeenCalled();
    expect(venta.listProductGrid).toEqual([linea]);
    expect(venta.enviandoPedido).toBeFalse();
    expect(aviso).toHaveBeenCalledOnceWith('Enviar pedido', 'La cuenta ha cambiado.');
  });

  it('anula la línea seleccionada con el motivo, incluso para un pedido creado localmente sin IdPedido numérico', async () => {
    const { venta, sesionLocal, linea } = crearVenta();
    const anterior = { identificador: 'OFF-E8-prueba', version: 2, contenido: { IdPedido: 0, NroCuenta: 1, Estado: 1 } };
    const siguiente = { ...anterior, version: 3 };
    Object.assign(sesionLocal, { permiteAnular: true, cuentas: [siguiente] });
    venta.cuentaLocalSeleccionada = anterior;
    linea.Item = 7;
    venta.abrirCuentaLocal = jasmine.createSpy('mostrar cuenta actualizada');

    await venta.realizarEliminacion(linea, 'El cliente cambió su pedido');

    expect(sesionLocal.registrarOperacion).toHaveBeenCalledOnceWith('pedidos/modificar', {
      referenciaPedido: anterior.identificador, versionPedido: 2, accion: 'anular-producto', item: 7, motivo: 'El cliente cambió su pedido',
    });
    expect(venta.abrirCuentaLocal).toHaveBeenCalledOnceWith(siguiente);
  });

  it('si se pierde el acuse online, no duplica la comanda al reintentar en la nube o en la caja local', async () => {
    const { venta, sesionLocal, linea } = crearVenta();
    let local = false;
    Object.defineProperty(venta, 'modoCajaLocal', { get: () => local });
    venta.storageService.getCurrentSession = () => ({ User: { IdUsuario: 17 } });
    venta.pedidoService.GrabarPedido.and.returnValue(throwError(() => ({ status: 0 })));
    const aviso = spyOn(Notificar, 'advertencia');
    await venta.EnviarPedido();
    await venta.EnviarPedido();
    local = true;
    await venta.EnviarPedido();

    expect(venta.pedidoService.GrabarPedido).toHaveBeenCalledTimes(1);
    expect(sesionLocal.registrarOperacion).not.toHaveBeenCalled();
    expect(venta.listProductGrid).toEqual([linea]);
    expect(aviso).toHaveBeenCalled();
    const confirmar = spyOn(Notificar, 'confirmar').and.resolveTo(false);
    expect(await venta.confirmarSalidaDeVenta()).toBeFalse();
    expect(confirmar).toHaveBeenCalledWith(jasmine.objectContaining({ titulo: 'Pedido sin confirmación de la nube' }));
  });

  it('cuando vuelve Internet conserva el borrador local si el cajero decide seguir en el pedido', async () => {
    const { venta, sesionLocal, linea } = crearVenta();
    Object.assign(sesionLocal, { nube: true, refrescar: async () => {}, salir: jasmine.createSpy('salir') });
    spyOn(Notificar, 'confirmar').and.resolveTo(false);
    const limpiar = spyOn(venta, 'limpiarPedido');

    await venta.volverAlServicioOnline();

    expect(venta.listProductGrid).toEqual([linea]);
    expect(limpiar).not.toHaveBeenCalled();
    expect(venta.sesionLocal.salir).not.toHaveBeenCalled();
  });

  it('aplica el descuento elegido en el mismo diálogo usando la copia local y la versión de la cuenta', async () => {
    const { venta, sesionLocal, linea } = crearVenta();
    const cuenta = { identificador: 'ONLINE-3-1', version: 2, contenido: { Estado: 1 } };
    const descuento = { Activo: true, IdDescuento: 4, Porcentaje: 15 };
    Object.assign(sesionLocal, { permiteDescuento: true, maestros: { descuentos: [descuento] },
      cuentas: [{ ...cuenta, version: 3 }] });
    venta.cuentaLocalSeleccionada = cuenta;
    venta.abrirCuentaLocal = jasmine.createSpy('mostrar descuento');
    linea.Item = 1;
    venta.dialog = { open: jasmine.createSpy('descuento').and.returnValue({ afterClosed: () => of({
      retornaIdDescuento: 4, retornaPorcentaje: 15, retornaNroCupon: 'D15',
    }) }) };
    venta.openDialogoDescuento(linea);
    await Promise.resolve();

    expect(venta.dialog.open.calls.mostRecent().args[1].data.descuentos).toEqual([descuento]);
    expect(sesionLocal.registrarOperacion).toHaveBeenCalledOnceWith('pedidos/modificar', {
      referenciaPedido: cuenta.identificador, versionPedido: 2, accion: 'descuento', item: 1,
      idDescuento: 4, porcentaje: 15, nroCupon: 'D15',
    });
  });

  it('el diálogo habitual de división usa la cuenta seleccionada y conserva una línea en origen', async () => {
    const linea = { Producto: { NombreCorto: 'Café' }, Estado: 1, Item: 1, Cantidad: 1, Subtotal: 5 };
    const cuenta = { identificador: 'OFF-E2-prueba', version: 3,
      contenido: { IdEspacio: 7, NroCuenta: 1, Estado: 1, ListaPedidoDet: [linea, { ...linea, Item: 2 }] } };
    const destino = { identificador: cuenta.identificador + '-C2', version: 4,
      contenido: { ...cuenta.contenido, NroCuenta: 2, ListaPedidoDet: [linea] } };
    const dividir = jasmine.createSpy('dividir').and.resolveTo([cuenta, destino]);
    const cerrar = jasmine.createSpy('seleccionar cuenta');
    const dialogo = new DialogDividirCuentaComponent({ close: cerrar } as any, { idPedido: 0,
      espacioSelected: { IdEspacio: 7 }, local: { simbolo: 'S/', cuentas: [cuenta], dividir, permiteDividir: true } } as any,
      {} as any, {} as any, {} as any, {} as any);

    await dialogo.ngOnInit();
    dialogo.onAddClick();
    dialogo.moverProducto(dialogo.pedidoCuentaOrigen[0]);
    dialogo.moverProducto(dialogo.pedidoCuentaOrigen[0]);
    await dialogo.onAcceptClick();
    dialogo.onShowClick();

    expect(dividir).toHaveBeenCalledOnceWith(cuenta, [1]);
    expect(cerrar).toHaveBeenCalledWith(jasmine.objectContaining({ referenciaLocal: destino.identificador, nroCuenta: 2 }));
  });
});
