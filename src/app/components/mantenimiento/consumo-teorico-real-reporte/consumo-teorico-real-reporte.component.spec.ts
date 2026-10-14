import { ConsumoTeoricoRealReporteComponent } from './consumo-teorico-real-reporte.component';
import * as XLSX from 'xlsx';
import { ConsumoTeoricoRealReporteItem } from 'src/app/models/reportes-almacen.models';

describe('ConsumoTeoricoRealReporteComponent', () => {
  function crearComponente(): ConsumoTeoricoRealReporteComponent {
    return new ConsumoTeoricoRealReporteComponent(
      { close: jasmine.createSpy('close') } as any,
      {} as any,
      {} as any,
    );
  }

  it('inicializa el rango con las fechas locales del navegador', () => {
    const component = crearComponente();

    expect(component.fechaDesde).toMatch(/^\d{4}-\d{2}-01$/);
    expect(component.fechaHasta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('filtra por artículo sin distinguir mayúsculas ni tildes', () => {
    const component = crearComponente();
    component.dataSource.data = [
      crearItem(4, 'QA MASA PRODUCIDA'),
      crearItem(4, 'Café molido'),
    ];

    component.filtro = 'cafe';
    component.aplicarFiltro();

    expect(component.dataSource.filteredData.map(item => item.Articulo))
      .toEqual(['Café molido']);
  });

  it('exporta exactamente las filas visibles después de aplicar el filtro', () => {
    const component = crearComponente();
    component.dataSource.data = [
      crearItem(4, 'QA MASA PRODUCIDA', 7, 7.25, 0.25),
      crearItem(4, 'QA HARINA', 2.5, 2, -0.5),
    ];
    component.filtro = 'QA MASA';
    component.aplicarFiltro();
    const jsonToSheet = spyOn(XLSX.utils, 'json_to_sheet').and.callThrough();

    component.exportarExcel();

    const filas = jsonToSheet.calls.mostRecent().args[0] as Array<Record<string, unknown>>;
    expect(filas.length).toBe(1);
    expect(filas[0]['Artículo']).toBe('QA MASA PRODUCIDA');
    expect(filas[0]['Consumo teórico']).toBe(7);
    expect(filas[0]['Consumo real']).toBe(7.25);
    expect(filas[0]['Diferencia']).toBe(0.25);
  });

  function crearItem(
    idInventario: number,
    articulo: string,
    consumoTeorico = 0,
    consumoReal = 0,
    diferencia = 0,
  ): ConsumoTeoricoRealReporteItem {
    return {
      IdInventario: idInventario,
      FechaInventario: '2026-10-14T13:01:00Z',
      IdSubAreaAlmacen: 1,
      SubAreaAlmacen: 'COCINA',
      IdArticulo: idInventario,
      Articulo: articulo,
      IdUnidadMedida: 1028,
      UnidadMedida: 'KILOS',
      StockInicio: 10,
      Ingresos: 0,
      ConsumoTeorico: consumoTeorico,
      StockSistema: 10 - consumoTeorico,
      StockContado: 10 - consumoReal,
      ConsumoReal: consumoReal,
      Diferencia: diferencia,
      DiferenciaPorcentaje: null,
    };
  }
});
