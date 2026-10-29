import { DashboardAlmacenComponent } from './dashboard-almacen.component';

describe('DashboardAlmacenComponent', () => {
  let component: DashboardAlmacenComponent;
  beforeEach(() => {
    component = new DashboardAlmacenComponent({} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  });

  it('separa compras por moneda y respeta el proveedor en la serie', () => {
    component.moneda = 'PEN';
    component.proveedor = 1;
    component.meses = [{ rango: { desde: '2026-10-01', hasta: '2026-10-31', etiqueta: '10/2026' },
      compras: [
        { IdProveedor: 1, Proveedor: 'A', Moneda: 'PEN', Importe: 100 },
        { IdProveedor: 1, Proveedor: 'A', Moneda: 'USD', Importe: 900 },
        { IdProveedor: 2, Proveedor: 'B', Moneda: 'PEN', Importe: 50 },
      ], mermas: [] }];
    expect(component.serieCompras[0].valor).toBe(100);
    component.moneda = 'USD';
    expect(component.serieCompras[0].valor).toBe(900);
  });

  it('no publica una serie mensual incompleta como si fuera correcta', () => {
    component.moneda = 'PEN';
    component.meses = [{ rango: { desde: '2026-10-01', hasta: '2026-10-31', etiqueta: '10/2026' }, compras: null, mermas: null }];
    expect(component.serieCompras).toEqual([]);
    expect(component.serieMermas).toEqual([]);
    expect(component.hayErroresMensuales).toBeTrue();
  });

  it('calcula diferencias entre stock contado y stock del sistema sin sumar artículos distintos', () => {
    component.inventarios = { Items: [
      { IdInventario: 1, IdSubAreaAlmacen: 1, SubAreaAlmacen: 'Cocina', Articulo: 'Arroz', StockSistema: 10, StockContado: 8 },
      { IdInventario: 2, IdSubAreaAlmacen: 2, SubAreaAlmacen: 'Bar', Articulo: 'Vino', StockSistema: 0, StockContado: 2 },
    ] } as any;
    expect(component.inventarioGrafico.length).toBe(1);
    expect(component.inventarioGrafico[0].valor).toBe(-20);
    component.subarea = 2;
    expect(component.inventarioGrafico).toEqual([]);
  });
});
