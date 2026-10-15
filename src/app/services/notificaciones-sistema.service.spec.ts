import { NotificacionesSistemaService } from './notificaciones-sistema.service';

describe('NotificacionesSistemaService · interruptor general', () => {
  let preferencias: { obtenerPreferencias: jasmine.Spy; recibeTipo: jasmine.Spy };
  let mostrar: jasmine.Spy;
  let service: NotificacionesSistemaService;

  beforeEach(() => {
    spyOnProperty(Notification, 'permission', 'get').and.returnValue('granted');
    spyOnProperty(document, 'visibilityState', 'get').and.returnValue('hidden');
    spyOn(document, 'hasFocus').and.returnValue(false);
    mostrar = jasmine.createSpy().and.resolveTo();
    spyOn(navigator.serviceWorker, 'getRegistration').and.resolveTo({ showNotification: mostrar } as any);
    preferencias = { obtenerPreferencias: jasmine.createSpy().and.resolveTo({ RecibirPorPush: false }), recibeTipo: jasmine.createSpy().and.resolveTo(true) };
    service = new NotificacionesSistemaService(preferencias as any);
  });

  it('permiso del navegador concedido no salta el interruptor apagado', async () => {
    expect(await service.mostrarAprobacion(1, 'Solicitud', 'Detalle')).toBeFalse();
    expect(mostrar).not.toHaveBeenCalled();
  });

  it('interruptor encendido permite el aviso del sistema', async () => {
    preferencias.obtenerPreferencias.and.resolveTo({ RecibirPorPush: true, PuedeElegirPush: true });
    expect(await service.mostrarAprobacion(1, 'Solicitud', 'Detalle', 'AUT_ANULAR_PRODUCTO')).toBeTrue();
    expect(mostrar).toHaveBeenCalledTimes(1);
  });

  it('dejar de ser administrador o gerente impide avisos aunque conserve la preferencia', async () => {
    preferencias.obtenerPreferencias.and.resolveTo({ RecibirPorPush: true, PuedeElegirPush: false });
    expect(await service.mostrarAprobacion(1, 'Solicitud', 'Detalle')).toBeFalse();
    expect(mostrar).not.toHaveBeenCalled();
  });

  it('si no puede confirmar la preferencia no emite push local', async () => {
    preferencias.obtenerPreferencias.and.rejectWith(new Error('sin red'));
    expect(await service.mostrarAprobacion(1, 'Solicitud', 'Detalle')).toBeFalse();
    expect(mostrar).not.toHaveBeenCalled();
  });

  it('canal activo pero tipo desuscrito no emite un aviso nativo', async () => {
    preferencias.obtenerPreferencias.and.resolveTo({ RecibirPorPush: true, PuedeElegirPush: true });
    preferencias.recibeTipo.and.resolveTo(false);
    expect(await service.mostrarAprobacion(1, 'Solicitud', 'Detalle', 'AUT_ANULAR_PRODUCTO')).toBeFalse();
    expect(mostrar).not.toHaveBeenCalled();
  });
});
