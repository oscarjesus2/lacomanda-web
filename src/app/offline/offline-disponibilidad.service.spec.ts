import { fakeAsync, tick } from '@angular/core/testing';
import { BackendStatusService } from '../services/backend-status.service';
import { OfflineDisponibilidadService } from './offline-disponibilidad.service';

describe('OfflineDisponibilidadService', () => {
  it('detecta una caída sin esperar una operación del cajero y deja de sondear al salir', fakeAsync(() => {
    const backend = new BackendStatusService();
    const service = new OfflineDisponibilidadService(backend);
    const comprobar = jasmine.createSpy('salud').and.resolveTo(false);
    let ofrecida = false;
    service.ofrecerAutomaticamente$.subscribe(valor => ofrecida = valor);
    service.vigilar(comprobar);
    tick(300000);
    expect(ofrecida).toBeTrue();
    service.detenerVigilancia();
    const llamadas = comprobar.calls.count();
    tick(60000);
    expect(comprobar.calls.count()).toBe(llamadas);
  }));

  it('permite solicitar manualmente durante la caída y ofrece automáticamente tras cinco minutos', fakeAsync(() => {
    const backend = new BackendStatusService();
    const service = new OfflineDisponibilidadService(backend);
    let ofrecida = false;
    service.ofrecerAutomaticamente$.subscribe(valor => ofrecida = valor);

    expect(service.permiteSolicitudManual).toBeTrue();
    backend.markDown();
    expect(service.permiteSolicitudManual).toBeTrue();
    tick(299999);
    expect(ofrecida).toBeFalse();
    tick(1);
    expect(ofrecida).toBeTrue();
  }));

  it('reinicia el plazo cuando vuelve la conexión y no lo reinicia por fallos repetidos', fakeAsync(() => {
    const backend = new BackendStatusService();
    const service = new OfflineDisponibilidadService(backend);
    let ofrecida = false;
    service.ofrecerAutomaticamente$.subscribe(valor => ofrecida = valor);

    backend.markDown();
    tick(180000);
    backend.markDown();
    tick(120000);
    expect(ofrecida).toBeTrue();
    backend.markUp();
    expect(ofrecida).toBeFalse();
    expect(service.permiteSolicitudManual).toBeTrue();
    backend.markDown();
    tick(299999);
    expect(ofrecida).toBeFalse();
    tick(1);
    expect(ofrecida).toBeTrue();
  }));

  it('no ofrece el modo si la conexión vuelve antes de que se cumpla el plazo', fakeAsync(() => {
    const backend = new BackendStatusService();
    const service = new OfflineDisponibilidadService(backend);
    let ofrecida = false;
    service.ofrecerAutomaticamente$.subscribe(valor => ofrecida = valor);

    backend.markDown();
    tick(299999);
    backend.markUp();
    tick(300000);
    expect(ofrecida).toBeFalse();
  }));

  it('cuenta desde el inicio de la caída aunque el servicio se consulte después', fakeAsync(() => {
    const backend = new BackendStatusService();
    backend.markDown();
    tick(240000);
    const service = new OfflineDisponibilidadService(backend);
    let ofrecida = false;
    service.ofrecerAutomaticamente$.subscribe(valor => ofrecida = valor);
    tick(59999);
    expect(ofrecida).toBeFalse();
    tick(1);
    expect(ofrecida).toBeTrue();
  }));
});
