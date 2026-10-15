import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import { BandejaNotificacionesService } from './bandeja-notificaciones.service';
import { NotificacionResumen } from '../models/notificacion.models';

describe('BandejaNotificacionesService', () => {
  const aviso = (id: string, leida: string | null = null): NotificacionResumen => ({
    Id: id, CodigoTipo: 'CESIA_STOCK', Titulo: 'Atención', Resumen: 'Previsión para cuatro horas',
    FechaUtc: '2026-10-15T12:00:00Z', LeidaUtc: leida,
  });

  function crear() {
    const user = { IdUsuario: 7 };
    const http = { post: jasmine.createSpy().and.returnValue(of({ Success: true })),
      get: jasmine.createSpy().and.returnValue(of({ Success: true, Data: [aviso('1')] })),
      put: jasmine.createSpy().and.returnValue(of({ Success: true })) };
    const servicio = new BandejaNotificacionesService(http as any, { getCurrentSession: () => ({ TenantID: 'a' }),
      getCurrentUser: () => user, isAuthenticated: () => true } as any);
    return { servicio, http, user };
  }

  it('marca como leída solo después de guardar y conserva tres últimas', async () => {
    const { servicio, http } = crear();
    http.get.and.returnValue(of({ Success: true, Data: [aviso('1'), aviso('2', '2026-10-10T12:00:00Z'), aviso('3', '2026-10-11T12:00:00Z'), aviso('4', '2026-10-12T12:00:00Z')] }));
    await servicio.actualizar();
    const guardado = new Subject<any>();
    http.put.and.returnValue(guardado);
    const operacion = servicio.marcarLeida('1');
    expect(await firstValueFrom(servicio.pendientes$)).toBe(1);
    guardado.next({ Success: true }); guardado.complete();
    await operacion;
    expect(await firstValueFrom(servicio.pendientes$)).toBe(0);
    expect((await firstValueFrom(servicio.notificaciones$)).map(n => n.Id)).toEqual(['1', '4', '3']);
  });

  it('fallo al marcar no pierde una pendiente', async () => {
    const { servicio, http } = crear();
    await servicio.actualizar();
    http.put.and.returnValue(throwError(() => new Error('sin red')));
    await expectAsync(servicio.marcarLeida('1')).toBeRejected();
    expect(await firstValueFrom(servicio.pendientes$)).toBe(1);
  });

  it('una respuesta anterior a la lectura no la devuelve a pendientes', async () => {
    const { servicio, http } = crear();
    await servicio.actualizar();
    const respuesta = new Subject<any>();
    http.get.and.returnValue(respuesta);
    const cargando = servicio.actualizar();
    await Promise.resolve();
    await servicio.marcarLeida('1');
    respuesta.next({ Success: true, Data: [aviso('1')] }); respuesta.complete();
    await cargando;
    expect(await firstValueFrom(servicio.pendientes$)).toBe(0);
  });

  it('cambiar usuario no muestra respuestas de la sesión anterior', async () => {
    const { servicio, http, user } = crear();
    const respuesta = new Subject<any>();
    http.get.and.returnValue(respuesta);
    const cargando = servicio.actualizar();
    await Promise.resolve();
    user.IdUsuario = 8;
    servicio.detener();
    respuesta.next({ Success: true, Data: [aviso('1')] }); respuesta.complete();
    await cargando;
    expect(await firstValueFrom(servicio.notificaciones$)).toEqual([]);
  });

  it('un origen no disponible no oculta las notificaciones ya guardadas', async () => {
    const { servicio, http } = crear();
    http.post.and.returnValue(throwError(() => new Error('error fiscal')));
    await servicio.actualizar();
    expect(await firstValueFrom(servicio.pendientes$)).toBe(1);
    expect(await firstValueFrom(servicio.error$)).toBeTrue();
  });

  it('suscribir un tipo no escribe las preferencias de canal', async () => {
    const { servicio, http } = crear();
    await servicio.suscribir('AUT_ANULAR_PRODUCTO', false);
    expect(http.put.calls.mostRecent().args[0]).toContain('/notificaciones/tipos/AUT_ANULAR_PRODUCTO');
    expect(http.put.calls.mostRecent().args[1]).toEqual({ Recibir: false });
  });
});
