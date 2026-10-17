import { convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { NotificacionDetalleComponent } from './notificacion-detalle.component';
import { StockAlmacenConsultaComponent } from 'src/app/components/mantenimiento/stock-almacen-consulta/stock-almacen-consulta.component';

describe('Notificación · apertura y stock filtrado', () => {
  function crear() {
    const detalle = { Notificacion: { Id: 'n-1' }, Stock: { Alertas: [{ IdArticulo: 42 }, { IdArticulo: 51 }] } };
    const bandeja = { detalle: jasmine.createSpy().and.resolveTo(detalle), marcarLeida: jasmine.createSpy().and.resolveTo() };
    const dialog = { open: jasmine.createSpy() };
    const component = new NotificacionDetalleComponent({ paramMap: of(convertToParamMap({ id: 'n-1' })) } as any,
      bandeja as any, dialog as any, {} as any, {} as any, {} as any, { navigate: jasmine.createSpy() } as any);
    return { component, bandeja, dialog };
  }

  it('abrir el detalle marca automáticamente como leído después de cargarlo', async () => {
    const { component, bandeja } = crear();
    component.ngOnInit();
    await Promise.resolve(); await Promise.resolve();
    expect(bandeja.marcarLeida).toHaveBeenCalledOnceWith('n-1');
    expect(component.detalle).not.toBeNull();
    component.ngOnDestroy();
  });

  it('si el detalle falla no marca como leído', async () => {
    const { component, bandeja } = crear();
    bandeja.detalle.and.rejectWith(new Error('sin acceso'));
    component.ngOnInit(); await Promise.resolve();
    expect(bandeja.marcarLeida).not.toHaveBeenCalled();
    expect(component.error).toBeTrue();
    component.ngOnDestroy();
  });

  it('consultar stock transporta solo los artículos del aviso', async () => {
    const { component, dialog } = crear();
    component.ngOnInit(); await Promise.resolve(); await Promise.resolve();
    component.revisarStock();
    expect(dialog.open).toHaveBeenCalledWith(StockAlmacenConsultaComponent, jasmine.objectContaining({ data: { idsArticulos: [42, 51] } }));
    component.ngOnDestroy();
  });
});
