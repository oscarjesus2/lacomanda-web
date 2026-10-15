import { of } from 'rxjs';
import { StockAlmacenConsultaComponent } from './stock-almacen-consulta.component';

describe('Stock de los artículos de una notificación', () => {
  function crear(idsArticulos?: number[]) {
    const Items = [
      { IdProducto: 42, Producto: 'Arroz', StockActual: 3, BajoMinimo: true },
      { IdProducto: 51, Producto: 'Pollo', StockActual: 8, BajoMinimo: false },
      { IdProducto: 63, Producto: 'Agua', StockActual: 99, BajoMinimo: false },
    ];
    const api = { consultar: jasmine.createSpy().and.returnValue(of({ Success: true, Data: { Items, CantidadRegistros: 3, CantidadBajoMinimo: 1, StockTotalSeleccionado: 110 } })) };
    return new StockAlmacenConsultaComponent({} as any, api as any, idsArticulos ? { idsArticulos } : null);
  }

  it('filtra filas y resúmenes y conserva la selección al actualizar o cambiar de área', () => {
    const componente = crear([42, 51]);
    componente.ngOnInit();
    expect(componente.dataSource.data.map(i => i.IdProducto)).toEqual([42, 51]);
    expect(componente.consulta?.CantidadRegistros).toBe(2);
    expect(componente.consulta?.StockTotalSeleccionado).toBe(11);
    componente.cambiarArea();
    expect(componente.dataSource.data.map(i => i.IdProducto)).toEqual([42, 51]);
  });

  it('la consulta normal sigue mostrando todos los artículos', () => {
    const componente = crear(); componente.ngOnInit();
    expect(componente.dataSource.data.length).toBe(3);
  });
});
