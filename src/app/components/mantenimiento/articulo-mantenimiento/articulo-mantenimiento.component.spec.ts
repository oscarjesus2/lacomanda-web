import { ArticuloMantenimientoComponent } from './articulo-mantenimiento.component';

describe('ArticuloMantenimientoComponent', () => {
  it('al elegir Ninguno reemplaza el impuesto previo y mantiene sincronizado el identificador', () => {
    const component = new ArticuloMantenimientoComponent(
      {} as any, {} as any, {} as any, {} as any, {} as any,
      {} as any, {} as any, {} as any, null,
    );
    component.articulo.Impuestos = ['IGV18'];
    component.articulo.IdImpuestoPais = 'IGV18';
    (component as any).impuestosAnteriores = ['IGV18'];

    component.cambiarImpuestos(['IGV18', 'NINGUNO_PE']);
    expect(component.articulo.Impuestos).toEqual(['NINGUNO_PE']);
    expect(component.articulo.IdImpuestoPais).toBe('NINGUNO_PE');

    component.cambiarImpuestos([]);
    expect(component.articulo.Impuestos).toEqual([]);
    expect(component.articulo.IdImpuestoPais).toBe('');
  });
});
