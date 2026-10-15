import { of } from 'rxjs';
import { DialogSolicitudesAutorizacionComponent } from './dialog-solicitudes-autorizacion.component';

describe('Notificaciones · preferencia Cesia Push', () => {
  function crear() {
    const push = {
      obtenerEstadoCesia: jasmine.createSpy().and.resolveTo({ Habilitado: false, Disponible: true }),
      cambiarPreferenciaCesia: jasmine.createSpy().and.resolveTo({ Habilitado: true, Disponible: true }),
    };
    const componente = new DialogSolicitudesAutorizacionComponent(
      {} as any, {} as any, {} as any, {} as any, {} as any,
      { alertas$: of([]), habilitado$: of(true) } as any, push as any,
    );
    return { componente, push };
  }

  it('lee la preferencia guardada sin activarla automáticamente', async () => {
    const { componente, push } = crear();
    await componente.cargarPushCesia();
    expect(componente.cargandoPushCesia).toBeFalse();
    expect(componente.recibirCesiaPush).toBeFalse();
    expect(componente.pushCesiaDisponible).toBeTrue();
    expect(push.cambiarPreferenciaCesia).not.toHaveBeenCalled();
  });

  it('guarda confirmación y no cambia el correo', async () => {
    const { componente } = crear();
    componente.recibirPorCorreo = true;
    await componente.cambiarPushCesia(true);
    expect(componente.recibirCesiaPush).toBeTrue();
    expect(componente.recibirPorCorreo).toBeTrue();
  });

  it('restaura el interruptor si falla el permiso o el servidor', async () => {
    const { componente, push } = crear();
    push.cambiarPreferenciaCesia.and.rejectWith(new Error('denegado'));
    await componente.cambiarPushCesia(true);
    expect(componente.recibirCesiaPush).toBeFalse();
    expect(componente.errorPushCesia).toBeTrue();
    expect(componente.guardandoPushCesia).toBeFalse();
  });

  it('un fallo de consulta ofrece reintentar sin mostrar activado', async () => {
    const { componente, push } = crear();
    push.obtenerEstadoCesia.and.rejectWith(new Error('sin red'));
    await componente.cargarPushCesia();
    expect(componente.errorPushCesia).toBeTrue();
    expect(componente.recibirCesiaPush).toBeFalse();
    push.obtenerEstadoCesia.and.resolveTo({ Habilitado: true, Disponible: true });
    await componente.cargarPushCesia();
    expect(componente.errorPushCesia).toBeFalse();
    expect(componente.recibirCesiaPush).toBeTrue();
  });

  it('evita dobles guardados', async () => {
    const { componente, push } = crear();
    componente.guardandoPushCesia = true;
    await componente.cambiarPushCesia(true);
    expect(push.cambiarPreferenciaCesia).not.toHaveBeenCalled();
  });
});
