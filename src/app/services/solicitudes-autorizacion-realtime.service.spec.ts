import { NgZone } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';
import { CARACTERISTICAS_LICENCIA } from '../constants/caracteristicas-licencia';
import { NivelUsuarioEnum } from '../enums/enum';
import { SolicitudesAutorizacionRealtimeService } from './solicitudes-autorizacion-realtime.service';

describe('SolicitudesAutorizacionRealtimeService', () => {
  function crearServicio(opciones: {
    operacionCaja: boolean;
    comprobantesFiscales: boolean;
  }) {
    const api = {
      listarPendientes: jasmine.createSpy().and.returnValue(of([])),
    };
    const comprobantesApi = {
      listar: jasmine.createSpy().and.returnValue(of({ Registros: [] })),
    };
    const usuarioService = {
      getUsuarioActual: jasmine.createSpy().and.returnValue(of({
        Data: {
          Activo: true,
          IdNivel: NivelUsuarioEnum.Administrador,
        },
      })),
    };
    const licencia = {
      tieneCaracteristica: jasmine.createSpy().and.callFake((exigencia: unknown) => {
        if (exigencia === CARACTERISTICAS_LICENCIA.OperacionCaja) {
          return of(opciones.operacionCaja);
        }
        return of(opciones.comprobantesFiscales);
      }),
    };
    const zone = { run: (accion: () => unknown) => accion() } as NgZone;

    const servicio = new SolicitudesAutorizacionRealtimeService(
      {} as any,
      api as any,
      comprobantesApi as any,
      usuarioService as any,
      licencia as any,
      zone,
    );

    return { servicio, api, comprobantesApi, licencia };
  }

  it('en Comercio omite autorizaciones de caja y conserva avisos fiscales', async () => {
    const { servicio, api, comprobantesApi } = crearServicio({
      operacionCaja: false,
      comprobantesFiscales: true,
    });

    await servicio.sincronizar();

    expect(api.listarPendientes).not.toHaveBeenCalled();
    expect(comprobantesApi.listar).toHaveBeenCalledTimes(1);
    expect(servicio.esAprobador).toBeFalse();
    expect(await firstValueFrom(servicio.puedeVerCentroNotificaciones$))
      .toBeTrue();
  });

  it('carga ambas bandejas cuando la licencia incluye caja y corrección fiscal', async () => {
    const { servicio, api, comprobantesApi } = crearServicio({
      operacionCaja: true,
      comprobantesFiscales: true,
    });

    await servicio.sincronizar();

    expect(api.listarPendientes).toHaveBeenCalledTimes(1);
    expect(comprobantesApi.listar).toHaveBeenCalledTimes(1);
    expect(servicio.esAprobador).toBeTrue();
  });

  it('no consulta ni muestra el centro si el plan no incluye ninguna bandeja', async () => {
    const { servicio, api, comprobantesApi } = crearServicio({
      operacionCaja: false,
      comprobantesFiscales: false,
    });

    await servicio.sincronizar();

    expect(api.listarPendientes).not.toHaveBeenCalled();
    expect(comprobantesApi.listar).not.toHaveBeenCalled();
    expect(await firstValueFrom(servicio.puedeVerCentroNotificaciones$))
      .toBeFalse();
  });
});
