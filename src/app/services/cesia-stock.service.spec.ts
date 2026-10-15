import { fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { NivelUsuarioEnum } from '../enums/enum';
import { AlertaStockCesia, ConsultaAlertasStockCesia } from '../models/cesia-stock.models';
import { CesiaStockService, EstadoCesiaStock } from './cesia-stock.service';

describe('CesiaStockService', () => {
  const alerta = (tipo: AlertaStockCesia['Tipo'] = 'STOCK_BAJO'): AlertaStockCesia => ({
    Clave: '10:1', Tipo: tipo, IdArticulo: 10, Articulo: 'Arroz', Unidad: 'kg',
    StockRegistrado: 10, ConsumoPendiente: 6, StockEstimado: 4, StockMinimo: 5,
    ConsumoPorHora: null, HorasHastaAgotamiento: null,
  });
  const respuesta = (alertas: AlertaStockCesia[] = [alerta()]) => ({
    Success: true, Data: {
      GeneradoUtc: '2026-10-15T18:00:00Z', HorasProyeccion: 4, HorasObservacion: 2,
      ArticulosEvaluados: 1, ConsumosSinConfiguracion: 0, Alertas: alertas,
    } as ConsultaAlertasStockCesia,
  });

  function crear(nivel = NivelUsuarioEnum.Administrador, habilitado = true) {
    const sesion = { TenantID: 'tenant-a', User: { IdUsuario: 5, IdNivel: nivel } };
    const storage = {
      getCurrentSession: () => sesion, getCurrentUser: () => sesion.User,
      isAuthenticated: () => true,
    };
    const http = { get: jasmine.createSpy().and.returnValue(of(respuesta())) };
    const licencia = { tieneCaracteristica: jasmine.createSpy().and.returnValue(of(habilitado)) };
    const servicio = new CesiaStockService(http as any, storage as any, licencia as any);
    let estado: EstadoCesiaStock;
    servicio.estado$.subscribe(e => estado = e);
    const nuevas = jasmine.createSpy('nuevas');
    servicio.nuevas$.subscribe(nuevas);
    return { servicio, http, sesion, nuevas, estado: () => estado };
  }

  for (const nivel of [NivelUsuarioEnum.Administrador, NivelUsuarioEnum.Gerente]) {
    it(`notifica y actualiza una sola vez por minuto al nivel ${nivel}`, fakeAsync(() => {
      const f = crear(nivel);
      f.servicio.iniciar();
      f.servicio.iniciar();
      tick(0);
      expect(f.http.get).toHaveBeenCalledTimes(1);
      expect(f.estado().consulta?.Alertas.length).toBe(1);
      expect(f.nuevas).toHaveBeenCalledTimes(1);
      tick(60_000);
      expect(f.http.get).toHaveBeenCalledTimes(2);
      expect(f.nuevas).toHaveBeenCalledTimes(1);
      f.servicio.detener();
    }));
  }

  for (const nivel of [NivelUsuarioEnum.Cajero, NivelUsuarioEnum.Mozo]) {
    it(`no consulta ni muestra datos al nivel ${nivel}`, fakeAsync(() => {
      const f = crear(nivel);
      f.servicio.iniciar();
      tick(60_000);
      expect(f.http.get).not.toHaveBeenCalled();
      expect(f.estado().habilitado).toBeFalse();
      f.servicio.detener();
    }));
  }

  it('respeta la licencia antes de consultar inventario', fakeAsync(() => {
    const f = crear(NivelUsuarioEnum.Administrador, false);
    f.servicio.iniciar();
    tick(0);
    expect(f.http.get).not.toHaveBeenCalled();
    expect(f.estado().habilitado).toBeFalse();
    f.servicio.detener();
  }));

  it('avisa al subir la gravedad, sin repetir por variaciones de cantidad', fakeAsync(() => {
    const f = crear();
    f.servicio.iniciar();
    tick(0);
    f.http.get.and.returnValue(of(respuesta([alerta('RIESGO_AGOTAMIENTO')])));
    tick(60_000);
    expect(f.nuevas).toHaveBeenCalledTimes(2);
    f.http.get.and.returnValue(of(respuesta([{ ...alerta('RIESGO_AGOTAMIENTO'), StockEstimado: 3 }])));
    tick(60_000);
    expect(f.nuevas).toHaveBeenCalledTimes(2);
    f.servicio.detener();
  }));

  it('cancela peticiones y borra alertas al salir o cambiar de tenant', fakeAsync(() => {
    const f = crear();
    const pendiente = new Subject<any>();
    f.http.get.and.returnValue(pendiente);
    f.servicio.iniciar();
    tick(0);
    f.sesion.TenantID = 'tenant-b';
    f.servicio.iniciar();
    f.servicio.detener();
    pendiente.next(respuesta());
    expect(f.estado().consulta).toBeNull();
    expect(f.nuevas).not.toHaveBeenCalled();
    tick(60_000);
    expect(f.http.get).toHaveBeenCalledTimes(1);
  }));

  it('evita solicitudes simultáneas cuando el servidor tarda', fakeAsync(() => {
    const f = crear();
    const pendiente = new Subject<any>();
    f.http.get.and.returnValue(pendiente);
    f.servicio.iniciar();
    tick(120_000);
    expect(f.http.get).toHaveBeenCalledTimes(1);
    f.servicio.detener();
  }));

  it('conserva la última consulta marcada como obsoleta al fallar y se recupera', fakeAsync(() => {
    const f = crear();
    f.servicio.iniciar();
    tick(0);
    f.http.get.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    tick(60_000);
    expect(f.estado().error).toBeTrue();
    expect(f.estado().consulta?.Alertas.length).toBe(1);
    f.http.get.and.returnValue(of(respuesta()));
    tick(60_000);
    expect(f.estado().error).toBeFalse();
    expect(f.nuevas).toHaveBeenCalledTimes(1);
    f.servicio.detener();
  }));

  it('borra los datos y detiene el sondeo cuando el backend revoca el acceso', fakeAsync(() => {
    const f = crear();
    f.servicio.iniciar();
    tick(0);
    f.http.get.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    tick(60_000);
    expect(f.estado().consulta).toBeNull();
    expect(f.estado().habilitado).toBeFalse();
    tick(120_000);
    expect(f.http.get).toHaveBeenCalledTimes(2);
    f.servicio.detener();
  }));

  it('vuelve a avisar tras una resolución mantenida diez minutos', fakeAsync(() => {
    const f = crear();
    f.servicio.iniciar();
    tick(0);
    f.http.get.and.returnValue(of(respuesta([])));
    tick(600_000);
    f.http.get.and.returnValue(of(respuesta()));
    tick(60_000);
    expect(f.nuevas).toHaveBeenCalledTimes(2);
    f.servicio.detener();
  }));
});
