import { HttpClient } from '@angular/common/http';
import { isDevMode } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ServiceWorkerModule, SwPush } from '@angular/service-worker';
import { of } from 'rxjs';
import { EstacionTipoEnum, NivelUsuarioEnum } from './enums/enum';
import { opcionesServiceWorker } from './service-worker.config';
import { DeviceIdentifierService } from './services/device-identifier.service';
import { NotificacionesPushService } from './services/notificaciones-push.service';
import { StorageService } from './services/storage.service';

describe('Service worker · Web Push en desarrollo', () => {
  it('habilita el canal en modo desarrollo y registra sin esperar estabilidad', () => {
    expect(isDevMode()).toBeTrue();
    expect(opcionesServiceWorker()).toEqual({ enabled: true, registrationStrategy: 'registerImmediately' });
  });

  it('conserva la estrategia de registro de producción', () => {
    expect(opcionesServiceWorker(false)).toEqual({ enabled: true, registrationStrategy: 'registerWhenStable:30000' });
  });

  it('el SwPush real permite activar y guardar push con las opciones de desarrollo', async () => {
    const suscripcion = {
      toJSON: () => ({ endpoint: 'https://push.example/test', keys: { p256dh: 'key', auth: 'auth' } }),
    } as unknown as PushSubscription;
    const subscribe = jasmine.createSpy().and.resolveTo(suscripcion);
    // Se simula solo el navegador y el backend: no se registra ningún dispositivo real.
    spyOnProperty(navigator.serviceWorker, 'controller', 'get').and.returnValue({} as ServiceWorker);
    const registro = {
      pushManager: { getSubscription: async () => null, subscribe },
    } as unknown as ServiceWorkerRegistration;
    const registrarWorker = spyOn(navigator.serviceWorker, 'register').and.resolveTo(registro);
    spyOn(navigator.serviceWorker, 'getRegistration').and.resolveTo(registro);
    const permiso = spyOn(Notification, 'requestPermission').and.resolveTo('granted');
    const http = {
      get: jasmine.createSpy().and.returnValue(of({ Data: {
        SuscripcionPersistentePermitida: true, ClavePublica: 'cHVibGlj',
      } })),
      post: jasmine.createSpy().and.returnValue(of({ Data: true })),
      put: jasmine.createSpy().and.returnValue(of({ Data: { RecibirPorPush: true, RecibirPorCorreo: true } })),
    };
    TestBed.configureTestingModule({
      imports: [ServiceWorkerModule.register('ngsw-worker.js', opcionesServiceWorker())],
      providers: [
        { provide: HttpClient, useValue: http },
        { provide: StorageService, useValue: { getCurrentUser: () => ({
          IdNivel: NivelUsuarioEnum.Administrador, TipoCompu: EstacionTipoEnum.ADMINISTRADOR,
        }) } },
        { provide: DeviceIdentifierService, useValue: { getIdentifier: () => 'test-device' } },
      ],
    });

    expect(TestBed.inject(SwPush).isEnabled).toBeTrue();
    expect(registrarWorker).toHaveBeenCalledOnceWith('ngsw-worker.js', { scope: undefined });
    const resultado = await TestBed.inject(NotificacionesPushService).cambiarPreferenciaPush(true);
    expect(resultado.RecibirPorPush).toBeTrue();
    expect(resultado.RecibirPorCorreo).toBeTrue();
    expect(permiso).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledOnceWith({ userVisibleOnly: true, applicationServerKey: jasmine.any(Uint8Array) });
    expect(http.post.calls.mostRecent().args[1]).toEqual({
      IdentificadorEstacion: 'test-device', Endpoint: 'https://push.example/test', P256dh: 'key', Auth: 'auth',
    });
    expect(http.put.calls.mostRecent().args[1]).toEqual({ RecibirPorPush: true });
  });
});
