import Swal from 'sweetalert2';
import { fechaReporte, imprimirReporte } from './imprimir-reporte';

describe('imprimirReporte', () => {
  it('imprime todas las filas y protege el contenido del HTML', () => {
    const documento = { open: jasmine.createSpy(), write: jasmine.createSpy(), close: jasmine.createSpy() };
    const ventana = { document: documento, focus: jasmine.createSpy(), print: jasmine.createSpy() };
    spyOn(window, 'open').and.returnValue(ventana as unknown as Window);
    imprimirReporte({ titulo: 'Reporte <almacén>', detalles: ['Filtro <script>'], filas: [
      { Artículo: '<img src=x>', Cantidad: 1 }, { Artículo: 'Segundo', Cantidad: 2 }
    ] });
    const html = documento.write.calls.mostRecent().args[0] as string;
    expect(html).toContain('Reporte &lt;almacén&gt;');
    expect(html).toContain('Filtro &lt;script&gt;');
    expect(html).toContain('&lt;img src=x&gt;');
    expect(html).toContain('Segundo');
    expect(html).toContain('Resultados: 2');
    expect(ventana.print).toHaveBeenCalled();
  });

  it('incluye los gráficos en la impresión y escapa sus etiquetas', () => {
    const documento = { open: jasmine.createSpy(), write: jasmine.createSpy(), close: jasmine.createSpy() };
    const ventana = { document: documento, focus: jasmine.createSpy(), print: jasmine.createSpy() };
    spyOn(window, 'open').and.returnValue(ventana as unknown as Window);
    imprimirReporte({ titulo: 'Dashboard', filas: [{ Indicador: 'Stock', Valor: 1 }], graficos: [
      { titulo: 'Compras', barras: [{ etiqueta: '<Proveedor>', texto: 'PEN 20', ancho: 120 }] }
    ] });
    const html = documento.write.calls.mostRecent().args[0] as string;
    expect(html).toContain('&lt;Proveedor&gt;');
    expect(html).toContain('width:100%');
    expect(html).toContain('PEN 20');
  });

  it('avisa si no hay filas y no abre una ventana', () => {
    const abrir = spyOn(window, 'open');
    const alerta = spyOn(Swal, 'fire');
    imprimirReporte({ titulo: 'Reporte', filas: [] });
    expect(abrir).not.toHaveBeenCalled();
    expect(alerta).toHaveBeenCalled();
  });

  it('avisa si el navegador bloquea la ventana', () => {
    spyOn(window, 'open').and.returnValue(null);
    const alerta = spyOn(Swal, 'fire');
    imprimirReporte({ titulo: 'Reporte', filas: [{ Artículo: 'Uno' }] });
    expect(alerta).toHaveBeenCalled();
  });

  it('mantiene el día de una fecha sin hora', () => {
    expect(fechaReporte('2026-10-28')).toBe('28/10/2026');
    expect(fechaReporte(null)).toBe('—');
  });
});
