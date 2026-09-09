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
