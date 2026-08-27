import { MesaClienteComponent } from './mesa-cliente.component';

describe('MesaClienteComponent - contexto del asistente', () => {
  it('elimina toda la conversación al finalizar la visita actual', () => {
    const component = Object.create(MesaClienteComponent.prototype) as any;
    component.historialAsistente = [
      { Rol: 'user', Texto: 'Quiero algo ligero' },
      { Rol: 'assistant', Texto: 'Te recomiendo esta opción' }
    ];
    component.idsProductosRecomendados = [10, 20];
    component.productoAsistente = { IdProducto: 10 };
    component.preguntaAsistente = '¿Tiene picante?';
    component.errorAsistente = 'Error anterior';
    component.mostrarAsistente = true;
    component.idSesionContextoAsistente = 42;

    component.limpiarContextoAsistente();

    expect(component.historialAsistente).toEqual([]);
    expect(component.idsProductosRecomendados).toEqual([]);
    expect(component.productoAsistente).toBeUndefined();
    expect(component.preguntaAsistente).toBe('');
    expect(component.errorAsistente).toBe('');
    expect(component.mostrarAsistente).toBeFalse();
    expect(component.idSesionContextoAsistente).toBeUndefined();
  });
});
