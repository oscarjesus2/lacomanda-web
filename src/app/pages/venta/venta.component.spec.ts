import { of } from 'rxjs';
import { CanalVentaEnum } from 'src/app/enums/enum';

import { VentaComponent } from './venta.component';

describe('VentaComponent - canales por estación', () => {
  function crearComponente(modoMozo: boolean): VentaComponent {
    const component = Object.create(VentaComponent.prototype) as VentaComponent;
    component.isModoMozo = modoMozo;
    component.canalVentaEnum = CanalVentaEnum;
    component.idCanalVentaSelected = CanalVentaEnum.ESPACIO;
    component.idCanalVentaDefectoCaja = CanalVentaEnum.ESPACIO;
    component.listaTipoPedidos = [];
    return component;
  }

  it('oculta Entrada en la estación de mozo aunque esté configurado', () => {
    const component = crearComponente(true);
    component.listaTipoPedidos = [
      { IdCanalVenta: CanalVentaEnum.ESPACIO },
      { IdCanalVenta: CanalVentaEnum.ENTRADAS },
    ] as any;

    component.actualizarFlagsCanales();

    expect(component.isEspacio).toBeTrue();
    expect(component.isEntrada).toBeFalse();
  });

  it('mantiene Entrada visible en la estación de caja', () => {
    const component = crearComponente(false);
    component.listaTipoPedidos = [
      { IdCanalVenta: CanalVentaEnum.ENTRADAS },
    ] as any;
    component.idCanalVentaSelected = CanalVentaEnum.ENTRADAS;

    component.actualizarFlagsCanales();

    expect(component.isEntrada).toBeTrue();
  });

  it('no selecciona Entrada como canal predeterminado en modo mozo', () => {
    const component = crearComponente(true);
    component.listaTipoPedidos = [
      { IdCanalVenta: CanalVentaEnum.ENTRADAS },
      { IdCanalVenta: CanalVentaEnum.DELIVERY },
    ] as any;
    component.idCanalVentaDefectoCaja = CanalVentaEnum.ENTRADAS;
    const seleccionarCanal = spyOn(component, 'canalVenta');

    component.actualizarFlagsCanales();

    expect(seleccionarCanal).toHaveBeenCalledOnceWith(CanalVentaEnum.DELIVERY);
  });

  it('ignora una selección directa de Entrada en modo mozo', () => {
    const component = crearComponente(true);
    const limpiarPedido = spyOn<any>(component, 'limpiarPedido');
    const abrirEntradas = spyOn(component, 'abrirEntradas');

    component.canalVenta(CanalVentaEnum.ENTRADAS);

    expect(limpiarPedido).not.toHaveBeenCalled();
    expect(abrirEntradas).not.toHaveBeenCalled();
    expect(component.idCanalVentaSelected).toBe(CanalVentaEnum.ESPACIO);
  });
});

describe('VentaComponent - anulación de productos con aprobación', () => {
  const MI_USUARIO = 7;

  function crearComponente(puedeAprobar: boolean, dialogoDevuelve: unknown = { value: ' sin stock ' }) {
    const component = Object.create(VentaComponent.prototype) as any;
    component.puedeAprobarSolicitudes = puedeAprobar;
    component.idPedidoCobrar = 10;
    component.nroCuentaCobrar = 1;
    component.solicitudesPedido = new Map();
    component.listProductGrid = [];
    component.storageService = { getCurrentUser: () => ({ IdUsuario: MI_USUARIO }) };
    component.textCatalog = { get: (clave: string) => clave };
    component.dialog = {
      open: jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(dialogoDevuelve) }),
    };
    return component;
  }

  function linea(item: number): any {
    return { Item: item, IdPedido: 10, NroCuenta: 1, Producto: { NombreCorto: 'Pisco sour' } };
  }

  function solicitud(item: number, idUsuarioSolicita: number): any {
    return { IdSolicitud: 99, IdPedido: 10, NroCuenta: 1, Item: item, IdUsuarioSolicita: idUsuarioSolicita, UsuarioSolicita: 'Ana', Motivo: 'error' };
  }

  it('sin permiso de aprobación envía una solicitud con el motivo en lugar de anular', () => {
    const component = crearComponente(false);
    const solicitar = spyOn(component, 'solicitarAnulacionProducto').and.resolveTo();
    const anular = spyOn(component, 'realizarEliminacion').and.resolveTo();

    component.deleteProductGrid(linea(3));

    expect(solicitar).toHaveBeenCalledOnceWith(jasmine.objectContaining({ Item: 3 }), 'sin stock');
    expect(anular).not.toHaveBeenCalled();
  });

  it('con permiso de aprobación anula directamente', () => {
    const component = crearComponente(true);
    const solicitar = spyOn(component, 'solicitarAnulacionProducto').and.resolveTo();
    const anular = spyOn(component, 'realizarEliminacion').and.resolveTo();

    component.deleteProductGrid(linea(3));

    expect(anular).toHaveBeenCalledOnceWith(jasmine.objectContaining({ Item: 3 }), 'sin stock');
    expect(solicitar).not.toHaveBeenCalled();
  });

  it('no hace nada si se cierra el teclado sin motivo', () => {
    const component = crearComponente(false, { value: '   ' });
    const solicitar = spyOn(component, 'solicitarAnulacionProducto').and.resolveTo();

    component.deleteProductGrid(linea(3));

    expect(solicitar).not.toHaveBeenCalled();
  });

  it('una línea con solicitud propia pendiente ofrece retirarla', () => {
    const component = crearComponente(false);
    component.solicitudesPedido.set(3, solicitud(3, MI_USUARIO));
    const cancelar = spyOn(component, 'cancelarSolicitudPendiente').and.resolveTo();

    component.deleteProductGrid(linea(3));

    expect(cancelar).toHaveBeenCalled();
    expect(component.dialog.open).not.toHaveBeenCalled();
  });

  it('un aprobador que toca una línea pendiente de otra persona la aprueba', () => {
    const component = crearComponente(true);
    component.solicitudesPedido.set(3, solicitud(3, 55));
    const aprobar = spyOn(component, 'aprobarSolicitudPendiente').and.resolveTo();

    component.deleteProductGrid(linea(3));

    expect(aprobar).toHaveBeenCalled();
    expect(component.dialog.open).not.toHaveBeenCalled();
  });

  it('solo marca como pendiente las líneas de la cuenta abierta', () => {
    const component = crearComponente(false);
    component.solicitudesPedido.set(3, solicitud(3, MI_USUARIO));

    expect(component.solicitudPendiente(linea(3))).toBeTruthy();
    expect(component.solicitudPendiente({ ...linea(3), IdPedido: 11 })).toBeUndefined();
    expect(component.solicitudPendiente(linea(0))).toBeUndefined();
  });

  it('al aprobarse la solicitud quita la línea de la grilla', () => {
    const component = crearComponente(false);
    component.listProductGrid = [linea(3), linea(4)];
    component.solicitudesPedido.set(3, solicitud(3, MI_USUARIO));
    spyOn(component, 'actualizarDatosGrilla');

    component.quitarItemAnulado(3);

    expect(component.listProductGrid.map((l: any) => l.Item)).toEqual([4]);
    expect(component.solicitudesPedido.has(3)).toBeFalse();
  });
});

describe('VentaComponent - solicitudes sobre la cuenta', () => {
  function crearComponente(solicitudes: any[]) {
    const component = Object.create(VentaComponent.prototype) as any;
    component.solicitudesCuenta = solicitudes;
    component.textCatalog = { get: (clave: string, params?: any) => params ? `${clave}:${params.user}` : clave };
    return component;
  }

  const solicitud = (tipo: string, usuario = 'Ana') => ({
    IdSolicitud: 1,
    Tipo: tipo,
    Descripcion: 'Cuenta completa',
    UsuarioSolicita: usuario,
  });

  it('encuentra la solicitud pendiente por tipo', () => {
    const component = crearComponente([solicitud('AnularPedido')]);

    expect(component.solicitudCuentaPendiente('AnularPedido')).toBeTruthy();
    expect(component.solicitudCuentaPendiente('CambiarCamarero')).toBeUndefined();
  });

  it('resume las solicitudes pendientes con quién las pidió', () => {
    const component = crearComponente([solicitud('AnularPedido'), solicitud('CambiarCamarero', 'Luis')]);

    expect(component.resumenSolicitudesCuenta).toBe(
      'Cuenta completa (requestedBy:Ana) · Cuenta completa (requestedBy:Luis)',
    );
  });
});
