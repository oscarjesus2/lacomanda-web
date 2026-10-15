import { BehaviorSubject, of, throwError } from 'rxjs';
import { EstacionTipoEnum, NivelUsuarioEnum } from '../enums/enum';
import { NotificacionesPushService } from './notificaciones-push.service';

describe('NotificacionesPushService · canales generales', () => {
  let pedirPermiso: jasmine.Spy;
  let permisoGuardado: jasmine.Spy;
  beforeEach(() => {
    permisoGuardado = spyOnProperty(Notification, 'permission', 'get').and.returnValue('granted');
    pedirPermiso = spyOn(Notification, 'requestPermission').and.resolveTo('granted');
  });

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
    const preferencias = { RecibirPorCorreo: true, RecibirPorPush: false, PuedeElegirCorreo: true, PuedeElegirPush: true };
    const http = {
      get: jasmine.createSpy().and.callFake((url: string) => of({ Data: url.endsWith('/preferencias')
        ? preferencias : { Disponible: true, ClavePublica: 'public', SuscripcionPersistentePermitida: true } })),
      post: jasmine.createSpy().and.returnValue(of({ Data: { Habilitado: false, Disponible: true } })),
      put: jasmine.createSpy().and.callFake((_url: string, cambios: object) => of({ Data: { ...preferencias, ...cambios } })),
    };
    const usuario = { IdNivel: NivelUsuarioEnum.Administrador, TipoCompu: EstacionTipoEnum.ADMINISTRADOR };
    const service = new NotificacionesPushService(http as any, sw as any,
      { getCurrentUser: () => usuario } as any, { getIdentifier: () => 'device' } as any);
    return { service, sw, http, usuario, subscription, preferencias };
  }

  it('una suscripción del navegador no activa el interruptor general', async () => {
    const f = crear();
    expect(await f.service.obtenerEstadoGeneral()).toEqual({ Habilitado: false, Disponible: true, Vinculado: true, PuedeElegir: true });
    expect(f.http.put).not.toHaveBeenCalled();
    expect(pedirPermiso).not.toHaveBeenCalled();
  });

  it('sincronizar al entrar no reactiva el canal general', async () => {
    const f = crear();
    await f.service.sincronizarExistente();
    expect(f.http.post.calls.mostRecent().args[0]).toContain('/suscripciones');
    expect(f.http.put).not.toHaveBeenCalled();
    expect(pedirPermiso).not.toHaveBeenCalled();
  });

  it('alta sin suscripción solicita permiso y guarda opt-in explícito', async () => {
    const f = crear();
    permisoGuardado.and.returnValue('default');
    f.subscription.next(null);
    expect((await f.service.cambiarPreferenciaPush(true)).RecibirPorPush).toBeTrue();
    expect(pedirPermiso).toHaveBeenCalledTimes(1);
    expect(f.sw.requestSubscription).toHaveBeenCalledOnceWith({ serverPublicKey: 'public' });
    expect(f.http.put.calls.mostRecent().args[1]).toEqual({
      RecibirPorPush: true,
    });
  });

  it('un fallo al crear la suscripción no guarda consentimiento', async () => {
    const f = crear();
    f.subscription.next(null);
    f.sw.requestSubscription.and.rejectWith(new Error('Permission denied'));
    await expectAsync(f.service.cambiarPreferenciaPush(true)).toBeRejected();
    expect(f.http.put).not.toHaveBeenCalled();
  });

  it('cada reactivación solicita permiso aunque ya exista una suscripción y permiso concedido', async () => {
    const f = crear();
    await f.service.cambiarPreferenciaPush(true);
    expect(pedirPermiso).toHaveBeenCalledTimes(1);
    await f.service.cambiarPreferenciaPush(false);
    expect(pedirPermiso).toHaveBeenCalledTimes(1);
    await f.service.cambiarPreferenciaPush(true);
    expect(pedirPermiso).toHaveBeenCalledTimes(2);
    expect(f.http.post).toHaveBeenCalledTimes(2);
    expect(f.sw.requestSubscription).not.toHaveBeenCalled();
    expect(f.http.put.calls.mostRecent().args[1]).toEqual({ RecibirPorPush: true });
  });

  it('solicita permiso inmediatamente y espera la decisión antes de acceder al servidor', async () => {
    const f = crear();
    let responder!: (permiso: NotificationPermission) => void;
    pedirPermiso.and.returnValue(new Promise<NotificationPermission>(resolve => { responder = resolve; }));
    const activacion = f.service.cambiarPreferenciaPush(true);
    expect(pedirPermiso).toHaveBeenCalledTimes(1);
    expect(f.http.get).not.toHaveBeenCalled();
    expect(f.http.post).not.toHaveBeenCalled();
    expect(f.http.put).not.toHaveBeenCalled();
    responder('granted');
    await activacion;
    expect(f.http.put).toHaveBeenCalledTimes(1);
  });

  for (const permiso of ['denied', 'default'] as NotificationPermission[]) {
    it(`no guarda ni registra push si la solicitud de permiso devuelve ${permiso}`, async () => {
      const f = crear();
      permisoGuardado.and.returnValue(permiso);
      pedirPermiso.and.resolveTo(permiso);
      await expectAsync(f.service.cambiarPreferenciaPush(true)).toBeRejected();
      expect(pedirPermiso).toHaveBeenCalledTimes(1);
      expect(f.http.get).not.toHaveBeenCalled();
      expect(f.http.post).not.toHaveBeenCalled();
      expect(f.http.put).not.toHaveBeenCalled();
      expect(f.sw.requestSubscription).not.toHaveBeenCalled();
    });
  }

  it('si la solicitud de permiso falla no guarda la preferencia', async () => {
    const f = crear();
    pedirPermiso.and.rejectWith(new Error('Permission unavailable'));
    await expectAsync(f.service.cambiarPreferenciaPush(true)).toBeRejected();
    expect(f.http.get).not.toHaveBeenCalled();
    expect(f.http.put).not.toHaveBeenCalled();
  });

  it('desactivar el canal general conserva correo y no necesita proveedor ni PWA', async () => {
    const f = crear();
    f.http.get.and.returnValue(throwError(() => new Error('disabled provider')));
    f.sw.isEnabled = false;
    const resultado = await f.service.cambiarPreferenciaPush(false);
    expect(resultado.RecibirPorPush).toBeFalse();
    expect(resultado.RecibirPorCorreo).toBeTrue();
    expect(f.http.get).not.toHaveBeenCalled();
    expect(f.sw.unsubscribe).not.toHaveBeenCalled();
    expect(pedirPermiso).not.toHaveBeenCalled();
  });

  it('un cajero no puede activar el canal Web Push', async () => {
    const f = crear();
    f.usuario.IdNivel = NivelUsuarioEnum.Cajero;
    expect((await f.service.obtenerEstadoGeneral()).Disponible).toBeFalse();
    await expectAsync(f.service.cambiarPreferenciaPush(true)).toBeRejected();
    expect(f.http.post).not.toHaveBeenCalled();
    expect(pedirPermiso).not.toHaveBeenCalled();
  });

  it('un gerente sí puede activarlo', async () => {
    const f = crear();
    f.usuario.IdNivel = NivelUsuarioEnum.Gerente;
    expect((await f.service.cambiarPreferenciaPush(true)).RecibirPorPush).toBeTrue();
  });

  it('navegador sin service worker muestra no disponible', async () => {
    const f = crear();
    f.sw.isEnabled = false;
    expect(await f.service.obtenerEstadoGeneral()).toEqual({ Habilitado: false, Disponible: false, Vinculado: false, PuedeElegir: true });
    expect(f.http.post).not.toHaveBeenCalled();
  });

  it('solicita permiso al intentar activar aunque Web Push aún no esté habilitado en la aplicación', async () => {
    const f = crear();
    f.sw.isEnabled = false;
    pedirPermiso.and.resolveTo('denied');
    const activacion = f.service.cambiarPreferenciaPush(true);
    expect(pedirPermiso).toHaveBeenCalledTimes(1);
    await expectAsync(activacion).toBeRejected();
    expect(f.http.get).not.toHaveBeenCalled();
    expect(f.http.post).not.toHaveBeenCalled();
    expect(f.http.put).not.toHaveBeenCalled();
  });

  it('aceptar permiso sin soporte push no guarda una activación que no puede funcionar', async () => {
    const f = crear();
    f.sw.isEnabled = false;
    await expectAsync(f.service.cambiarPreferenciaPush(true)).toBeRejected();
    expect(pedirPermiso).toHaveBeenCalledTimes(1);
    expect(f.http.put).not.toHaveBeenCalled();
    expect(f.sw.requestSubscription).not.toHaveBeenCalled();
  });

  it('conserva la preferencia global para poder apagarla si falla la configuración del dispositivo', async () => {
    const f = crear();
    f.preferencias.RecibirPorPush = true;
    f.http.get.and.callFake((url: string) => url.endsWith('/preferencias')
      ? of({ Data: f.preferencias }) : throwError(() => new Error('sin proveedor')));
    expect((await f.service.obtenerEstadoGeneral()).Habilitado).toBeTrue();
    expect((await f.service.cambiarPreferenciaPush(false)).RecibirPorPush).toBeFalse();
  });
});
