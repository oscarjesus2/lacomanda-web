import { CanalVentaEnum } from '../../enums/enum';
import { VentaComponent } from './venta.component';
import { Notificar } from '../../shared/notificaciones';

describe('VentaComponent con sesión en la caja local', () => {
  const producto = { IdProducto: 9, NombreCorto: 'Café', Precio: 6, Visible: true, Activo: true, Tipo: 0 };
  const mesa = { IdEspacio: 5, IdAmbiente: 1, Ambiente: 'Terraza', Numero: 5, Ocupado: 1 };
  const usuario = { IdEmpleado: 4, NombreEmpleado: 'Ana' };
  const cuenta = {
    identificador: 'OFF-E2-1', version: 1, contenido: {
      IdPedido: 0, NroPedidoOffline: 'OFF-E2-1', IdEspacio: 5, NroCuenta: 1, NroPax: 2,
      IdEmpleado: 4, IdCanalVenta: CanalVentaEnum.ESPACIO, Estado: 1, Total: 12,
      ListaPedidoDet: [{ Producto: { IdProducto: 9 }, Item: 1, Cantidad: 2, Subtotal: 12, Estado: 1 }],
    },
  };

  function crear() {
    const sesion = {
      activa: true, esEquipoCaja: true, esCajero: true, usuario, usuarios: [usuario], productos: [producto],
      estado: { capacidades: { cobros: true } }, contexto: { paisISO2: 'PE' }, moneda: { IdMoneda: 'PEN', Simbolo: 'S/' },
      documentos: [{ IdTipoDocumento: 1, Descripcion: 'Factura' }, { IdTipoDocumento: 2, Descripcion: 'Boleta' }],
      maestros: { productos: [producto], mesas: [mesa], socios: [] }, caja: { IdCaja: 1 }, turno: { IdTurno: 10 },
      cuentas: [cuenta], canales: [{ id: CanalVentaEnum.ESPACIO, nombre: 'Mesa' }], actualizar: jasmine.createSpy().and.resolveTo(),
    };
    const venta = Object.assign(Object.create(VentaComponent.prototype), {
      sesionLocal: sesion, canalVentaEnum: CanalVentaEnum, idCanalVentaSelected: CanalVentaEnum.ESPACIO,
      headerService: { hideHeader: jasmine.createSpy() }, spinnerService: { show: jasmine.createSpy(), hide: jasmine.createSpy() },
      solicitudesPedido: new Map(), preciosSocioNegocio: new Map(), solicitudesQrPorEspacio: new Map(),
      gridListaPedidoDetProducto: { data: [] }, secuenciaSeleccionPedido: 0,
    }) as VentaComponent;
    return { venta, sesion };
  }

  it('abre el salón y la misma pantalla de detalle, con boleta y factura, sin servicios de nube ni sesión web', async () => {
    const { venta } = crear();
    await venta.ngOnInit();
    expect(venta.displayValueAmbiente).toBe('Terraza');
    expect(venta.listProductoVenta[0].NombreCorto).toBe('Café');
    expect(venta.mostrarBoleta && venta.mostrarFactura && venta.comprobantesHabilitados).toBeTrue();
    await venta.openDialogEspacio(venta.listaEspacios_x_Ambiente[0]);
    expect(venta.numeroPedido).toBe('OFF-E2-1');
    expect(venta.pedidoPersistido).toBeTrue();
    expect(venta.gridListaPedidoDetProducto.data[0].Producto.NombreCorto).toBe('Café');
    expect(venta.sumaGranTotal).toBe(12);
  });

  it('conserva la versión seleccionada hasta reabrir la cuenta y no edita el pedido guardado', async () => {
    const { venta, sesion } = crear();
    await venta.ngOnInit();
    await venta.openPedido(venta.listaPedidosPendientes[0]);
    venta.listProductGrid[0].Cantidad = 3;
    expect(cuenta.contenido.ListaPedidoDet[0].Cantidad).toBe(2);
    sesion.cuentas = [{ ...cuenta, version: 2 }];
    await venta.Refresh();
    expect(venta.cuentaLocalSeleccionada.version).toBe(1);
    await venta.openPedido(venta.listaPedidosPendientes[0]);
    expect(venta.cuentaLocalSeleccionada.version).toBe(2);
  });

  it('mantiene la cuenta en pantalla si falla la regularización al volver a la nube', async () => {
    const { venta, sesion } = crear();
    const salir = jasmine.createSpy();
    Object.assign(sesion, { prepararRegresoOnline: () => Promise.reject(new Error('Falta enviar el lote')), salir });
    spyOn(Notificar, 'informacion');
    await venta.ngOnInit();
    await venta.openPedido(venta.listaPedidosPendientes[0]);
    await venta.volverAlServicioOnline();
    expect(salir).not.toHaveBeenCalled();
    expect(venta.cuentaLocalSeleccionada.identificador).toBe(cuenta.identificador);
    expect(Notificar.informacion).toHaveBeenCalledWith('Revisa la caja local', 'Falta enviar el lote', 'warning');
  });

  it('espera la ocupación confirmada antes de permitir reabrir una mesa tras enviar un pedido', async () => {
    const { venta, sesion } = crear();
    sesion.maestros.mesas = [{ ...mesa, Ocupado: 0 }];
    sesion.cuentas = [];
    await venta.ngOnInit();
    const mesaAnterior = venta.listaEspacios_x_Ambiente[0];
    let confirmarLectura: () => void;
    sesion.actualizar.and.returnValue(new Promise<void>(resolve => confirmarLectura = resolve));
    const recarga = venta.Refresh();
    await venta.openDialogEspacio(mesaAnterior);
    expect(venta.isLoadingEspacios).toBeTrue();
    expect(venta.cuentaLocalSeleccionada).toBeUndefined();
    sesion.maestros.mesas = [mesa];
    sesion.cuentas = [cuenta];
    confirmarLectura();
    await recarga;
    await venta.openDialogEspacio(mesaAnterior);
    expect(venta.cuentaLocalSeleccionada.identificador).toBe(cuenta.identificador);
  });

  it('vuelve a la gestión de caja tras autenticar al operador para regularizar', async () => {
    const { venta, sesion } = crear();
    const navigate = jasmine.createSpy().and.resolveTo(true);
    Object.assign(venta, { router: { navigate } });
    Object.assign(sesion, {
      prepararRegresoOnline: () => Promise.resolve({ ruta: '/caja', requiereLogin: true, returnUrl: '/offline?regularizar=1' }),
      salir: jasmine.createSpy(),
    });
    await venta.volverAlServicioOnline();
    expect(navigate).toHaveBeenCalledWith(['/iniciar-sesion'], { queryParams: { returnUrl: '/offline?regularizar=1' } });
  });
});
