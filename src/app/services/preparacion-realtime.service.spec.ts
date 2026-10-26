import { NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { PreparacionRealtimeService } from './preparacion-realtime.service';
import { StorageService } from './storage.service';

describe('PreparacionRealtimeService', () => {
  let servicio: PreparacionRealtimeService;
  let hub: jasmine.SpyObj<signalR.HubConnection>;
  let eventos: Record<string, () => void>;
  let reconectado: () => void;

  beforeEach(() => {
    eventos = {};
    hub = jasmine.createSpyObj('hub', ['start', 'stop', 'on', 'onreconnected', 'onclose'], {
      state: signalR.HubConnectionState.Disconnected,
    });
    hub.start.and.resolveTo();
    hub.stop.and.resolveTo();
    hub.on.and.callFake((nombre: string, callback: () => void) => eventos[nombre] = callback);
    hub.onreconnected.and.callFake(callback => reconectado = callback as () => void);
    spyOn(signalR.HubConnectionBuilder.prototype, 'build').and.returnValue(hub);
    servicio = new PreparacionRealtimeService(
      jasmine.createSpyObj('storage', [], { getCurrentToken: () => 'token' }) as StorageService,
      new NgZone({ enableLongStackTrace: false }),
    );
  });

  afterEach(() => servicio.detener());

  it('conecta al iniciar y solicita sincronización al conectar, recibir cambios y reconectar', async () => {
    const cambios = jasmine.createSpy('cambios');
    servicio.cambios$.subscribe(cambios);
    servicio.iniciar();
    await Promise.resolve();
    expect(hub.start).toHaveBeenCalledTimes(1);
    expect(cambios).toHaveBeenCalledTimes(1);
    eventos['PreparacionActualizada']();
    reconectado();
    expect(cambios).toHaveBeenCalledTimes(3);
  });

  it('cierra la conexión al salir y descarta avisos de la conexión anterior', async () => {
    const cambios = jasmine.createSpy('cambios');
    servicio.cambios$.subscribe(cambios);
    servicio.iniciar();
    await Promise.resolve();
    servicio.detener();
    eventos['PreparacionActualizada']();
    reconectado();
    expect(cambios).toHaveBeenCalledTimes(1);
    expect(hub.stop).toHaveBeenCalledTimes(1);
  });
});
