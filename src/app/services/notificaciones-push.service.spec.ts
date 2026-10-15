import { BehaviorSubject, of, throwError } from 'rxjs';
import { EstacionTipoEnum, NivelUsuarioEnum } from '../enums/enum';
import { NotificacionesPushService } from './notificaciones-push.service';

describe('NotificacionesPushService · Cesia', () => {
  function crear() {
    const suscripcion = {
      endpoint: 'https://push.example/device',
      toJSON: () => ({ endpoint: 'https://push.example/device', keys: { p256dh: 'key', auth: 'auth' } }),
    } as unknown as PushSubscription;
    const subscription = new BehaviorSubject<PushSubscription | null>(suscripcion);
    const sw = {
      isEnabled: true, subscription,
      requestSubscription: jasmine.createSpy().and.callFake(async () => {
        subscription.next(suscripcion);
        return suscripcion;
      }),
      unsubscribe: jasmine.createSpy(),
    };
    const http = {
      get: jasmine.createSpy().and.returnValue(of({ Data: {
        Disponible: true, ClavePublica: 'public', SuscripcionPersistentePermitida: true,
      } })),
      post: jasmine.createSpy().and.returnValue(of({ Data: { Habilitado: false, Disponible: true } })),
      put: jasmine.createSpy().and.returnValue(of({ Data: { Habilitado: true, Disponible: true } })),
    };
    const usuario = { IdNivel: NivelUsuarioEnum.Administrador, TipoCompu: EstacionTipoEnum.ADMINISTRADOR };
    const service = new NotificacionesPushService(http as any, sw as any,
      { getCurrentUser: () => usuario } as any, { getIdentifier: () => 'device' } as any);
    return { service, sw, http, usuario, subscription };
  }

  it('una suscripción general no implica consentimiento de Cesia', async () => {
    const f = crear();
    expect(await f.service.obtenerEstadoCesia()).toEqual({ Habilitado: false, Disponible: true });
    expect(f.http.put).not.toHaveBeenCalled();
  });

  it('sincronizar al entrar no reactiva Cesia', async () => {
    const f = crear();
    await f.service.sincronizarExistente();
    expect(f.http.post.calls.mostRecent().args[0]).toContain('/suscripciones');
    expect(f.http.put).not.toHaveBeenCalled();
  });

  it('alta sin suscripción solicita permiso y guarda opt-in explícito', async () => {
    const f = crear();
    f.subscription.next(null);
    expect((await f.service.cambiarPreferenciaCesia(true)).Habilitado).toBeTrue();
    expect(f.sw.requestSubscription).toHaveBeenCalledOnceWith({ serverPublicKey: 'public' });
    expect(f.http.put.calls.mostRecent().args[1]).toEqual({
      Endpoint: 'https://push.example/device', IdentificadorEstacion: 'device', Habilitado: true,
    });
  });

  it('permiso denegado no guarda consentimiento', async () => {
    const f = crear();
    f.subscription.next(null);
    f.sw.requestSubscription.and.rejectWith(new Error('Permission denied'));
    await expectAsync(f.service.cambiarPreferenciaCesia(true)).toBeRejected();
    expect(f.http.put).not.toHaveBeenCalled();
  });

  it('desactivar no cancela el resto de push y no necesita proveedor disponible', async () => {
    const f = crear();
    f.http.get.and.returnValue(throwError(() => new Error('disabled provider')));
    f.http.put.and.returnValue(of({ Data: { Habilitado: false, Disponible: false } }));
    expect((await f.service.cambiarPreferenciaCesia(false)).Habilitado).toBeFalse();
    expect(f.http.get).not.toHaveBeenCalled();
    expect(f.sw.unsubscribe).not.toHaveBeenCalled();
  });

  it('un cajero no puede activar Cesia', async () => {
    const f = crear();
    f.usuario.IdNivel = NivelUsuarioEnum.Cajero;
    expect((await f.service.obtenerEstadoCesia()).Disponible).toBeFalse();
    await expectAsync(f.service.cambiarPreferenciaCesia(true)).toBeRejected();
    expect(f.http.post).not.toHaveBeenCalled();
  });

  it('un gerente sí puede activarlo', async () => {
    const f = crear();
    f.usuario.IdNivel = NivelUsuarioEnum.Gerente;
    expect((await f.service.cambiarPreferenciaCesia(true)).Habilitado).toBeTrue();
  });

  it('navegador sin service worker muestra no disponible', async () => {
    const f = crear();
    f.sw.isEnabled = false;
    expect(await f.service.obtenerEstadoCesia()).toEqual({ Habilitado: false, Disponible: false });
    expect(f.http.post).not.toHaveBeenCalled();
  });
});
