import { NgZone } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Session } from '../models/session.models';
import { StorageService } from '../services/storage.service';
import { CajaOfflineApiService, ContextoCaja, URL_CAJA_LOCAL } from './caja-offline-api.service';
import { CajaOfflineSincronizacionService } from './caja-offline-sincronizacion.service';

describe('CajaOfflineSincronizacionService', () => {
  const contexto: ContextoCaja = { tenantId: 'sucursal', identificadorEstacion: 'caja-1', idCaja: 2, idEstacion: 3 };
  let api: jasmine.SpyObj<CajaOfflineApiService>;
  let storage: jasmine.SpyObj<StorageService>;
  let servicio: CajaOfflineSincronizacionService;
  let sesion: Session;
  let marcaAnterior: string | null;
  let instalacionAnterior: string | null;

  beforeEach(() => {
    marcaAnterior = localStorage.getItem('offline.estacionPreparada');
    instalacionAnterior = localStorage.getItem('offline.instalacionPendiente');
    localStorage.removeItem('offline.estacionPreparada');
    localStorage.removeItem('offline.instalacionPendiente');
    api = jasmine.createSpyObj('api', ['estado', 'gestionar', 'comprobarNube', 'prepararImpresionLocal']);
    storage = jasmine.createSpyObj('storage', ['getCurrentSession']);
    const jwt = 'e30.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.firma';
    sesion = { Ip: 'caja-1', TenantID: 'Sucursal', Token: jwt } as Session;
    storage.getCurrentSession.and.returnValue(sesion);
    api.comprobarNube.and.resolveTo(true);
    api.estado.and.resolveTo({ disponible: true, mensaje: '', version: 12, contexto });
    api.gestionar.and.resolveTo({});
    servicio = new CajaOfflineSincronizacionService(api, storage, new NgZone({ enableLongStackTrace: false }));
  });

  afterEach(() => {
    servicio.ngOnDestroy();
    if (marcaAnterior === null) localStorage.removeItem('offline.estacionPreparada');
    else localStorage.setItem('offline.estacionPreparada', marcaAnterior);
    if (instalacionAnterior === null) localStorage.removeItem('offline.instalacionPendiente');
    else localStorage.setItem('offline.instalacionPendiente', instalacionAnterior);
  });

  it('solo opera desde la sesión y la estación preparadas', async () => {
    await servicio.actualizar();
    servicio.recordar(contexto);
    sesion.TenantID = 'otra';
    await servicio.actualizar();
    expect(api.comprobarNube).not.toHaveBeenCalled();
  });

  it('confirma los pendientes antes de publicar la nueva copia', async () => {
    servicio.recordar(contexto);
    await servicio.actualizar();
    expect(api.gestionar.calls.allArgs()).toEqual([
      [URL_CAJA_LOCAL, 'regularizar', sesion.Token], [URL_CAJA_LOCAL, 'sincronizar', sesion.Token],
    ]);
  });

  it('conserva la copia anterior cuando la nube rechaza el lote', async () => {
    servicio.recordar(contexto);
    api.gestionar.and.rejectWith(new HttpErrorResponse({ status: 409 }));
    let pendiente = false;
    servicio.requiereRevision$.subscribe(valor => pendiente = valor);
    await servicio.actualizar();
    expect(pendiente).toBeTrue();
    expect(api.gestionar.calls.count()).toBe(1);
    expect(api.gestionar.calls.first().args[1]).toBe('regularizar');
  });

  it('tras descargar y arrancar, prepara la primera copia usando la identidad instalada sin pedir datos', async () => {
    const identidad = { tenantId: 'sucursal', identificadorEstacion: 'caja-1' };
    api.estado.and.resolveTo({ disponible: false, mensaje: '', version: null, identidad });
    let avisos = 0;
    servicio.instalacionPreparada$.subscribe(() => avisos++);
    servicio.esperarInstalacion(identidad.tenantId, identidad.identificadorEstacion);

    await servicio.actualizar();

    expect(api.gestionar.calls.allArgs()).toEqual([
      [URL_CAJA_LOCAL, 'regularizar', sesion.Token], [URL_CAJA_LOCAL, 'sincronizar', sesion.Token],
    ]);
    expect(api.prepararImpresionLocal).toHaveBeenCalledTimes(1);
    expect(avisos).toBe(1);
    expect(localStorage.getItem('offline.instalacionPendiente')).toBeNull();
    expect(localStorage.getItem('offline.estacionPreparada')).toBe(JSON.stringify(['sucursal', 'caja-1']));
  });

  it('ignora una caja con identidad distinta aunque el usuario haya descargado el instalador', async () => {
    servicio.esperarInstalacion('sucursal', 'caja-1');
    for (const identidad of [
      { tenantId: 'otra-sucursal', identificadorEstacion: 'caja-1' },
      { tenantId: 'sucursal', identificadorEstacion: 'otra-caja' },
    ]) {
      api.estado.and.resolveTo({ disponible: false, mensaje: '', version: null, identidad });
      await servicio.actualizar();
    }
    expect(api.gestionar).not.toHaveBeenCalled();
    expect(localStorage.getItem('offline.estacionPreparada')).toBeNull();
  });

  it('conserva la preparación pendiente si falla el lote de una instalación existente', async () => {
    servicio.esperarInstalacion('sucursal', 'caja-1');
    api.gestionar.and.rejectWith(new HttpErrorResponse({ status: 409 }));
    await servicio.actualizar();
    expect(api.gestionar.calls.allArgs()).toEqual([[URL_CAJA_LOCAL, 'regularizar', sesion.Token]]);
    expect(localStorage.getItem('offline.instalacionPendiente')).not.toBeNull();
    expect(api.prepararImpresionLocal).not.toHaveBeenCalled();
  });

  it('suspende la primera copia cuando cambia la sesión durante la regularización', async () => {
    servicio.esperarInstalacion('sucursal', 'caja-1');
    api.gestionar.and.callFake(async () => { storage.getCurrentSession.and.returnValue(null); });
    await servicio.actualizar();
    expect(api.gestionar.calls.allArgs()).toEqual([[URL_CAJA_LOCAL, 'regularizar', sesion.Token]]);
    expect(localStorage.getItem('offline.instalacionPendiente')).not.toBeNull();
  });
});
