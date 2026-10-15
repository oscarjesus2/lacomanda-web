import { of } from 'rxjs';
import { DialogSolicitudesAutorizacionComponent } from './dialog-solicitudes-autorizacion.component';

describe('Notificaciones · preferencia general Push', () => {
  function crear() {
    const push = {
      obtenerEstadoGeneral: jasmine.createSpy().and.resolveTo({ Habilitado: false, Disponible: true, PuedeElegir: true, Vinculado: true }),
      cambiarPreferenciaPush: jasmine.createSpy().and.resolveTo({ RecibirPorPush: true, RecibirPorCorreo: true }),
    };
    const componente = new DialogSolicitudesAutorizacionComponent(
      {} as any, {} as any, {} as any, {} as any, {} as any,
      { alertas$: of([]), habilitado$: of(true) } as any, push as any, { error$: of(false) } as any,
    );
    return { componente, push };
  }

  it('lee la preferencia guardada sin activarla automáticamente', async () => {
    const { componente, push } = crear();
    await componente.cargarPush();
    expect(componente.cargandoPush).toBeFalse();
    expect(componente.recibirPush).toBeFalse();
    expect(componente.pushDisponible).toBeTrue();
    expect(push.cambiarPreferenciaPush).not.toHaveBeenCalled();
  });

  it('guarda confirmación y no cambia el correo', async () => {
    const { componente } = crear();
    componente.recibirPorCorreo = true;
    await componente.cambiarPush(true);
    expect(componente.recibirPush).toBeTrue();
    expect(componente.recibirPorCorreo).toBeTrue();
  });

  it('restaura el interruptor si falla el permiso o el servidor', async () => {
    const { componente, push } = crear();
    push.cambiarPreferenciaPush.and.rejectWith(new Error('denegado'));
    await componente.cambiarPush(true);
    expect(componente.recibirPush).toBeFalse();
    expect(componente.errorPush).toBeTrue();
    expect(componente.guardandoPush).toBeFalse();
  });

  it('un fallo de consulta ofrece reintentar sin mostrar activado', async () => {
    const { componente, push } = crear();
    push.obtenerEstadoGeneral.and.rejectWith(new Error('sin red'));
    await componente.cargarPush();
    expect(componente.errorPush).toBeTrue();
    expect(componente.recibirPush).toBeFalse();
    push.obtenerEstadoGeneral.and.resolveTo({ Habilitado: true, Disponible: true });
    await componente.cargarPush();
    expect(componente.errorPush).toBeFalse();
    expect(componente.recibirPush).toBeTrue();
  });

  it('evita dobles guardados', async () => {
    const { componente, push } = crear();
    componente.guardandoPush = true;
    await componente.cambiarPush(true);
    expect(push.cambiarPreferenciaPush).not.toHaveBeenCalled();
  });
});
