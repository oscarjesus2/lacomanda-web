import { firstValueFrom, Observable, of, Subject, throwError } from 'rxjs';
import { CARACTERISTICAS_LICENCIA } from '../constants/caracteristicas-licencia';
import { ERROR_GESTIONADO_POR_CONSUMIDOR } from '../interceptor/background-request.context';
import { LicenciaTenantService } from '../services/licencia-tenant.service';
import { LicenseGuard } from './license.guard';

describe('Acceso online según la licencia del puesto', () => {
  const feature = CARACTERISTICAS_LICENCIA.OperacionCaja;
  const estadoRuta = { url: '/caja' } as any;
  const route = { data: { feature } } as any;
  const permiso = { Success: true, Data: { Caracteristicas: [{ Codigo: feature, Habilitada: true }] } };
  const destino = (acceso: string) => ({ ruta: '/iniciar-sesion', queryParams: { acceso, returnUrl: '/caja' } });

  function preparar(roles = ['caja']) {
    const http = { get: jasmine.createSpy('licencia/me') };
    const licencia = new LicenciaTenantService(http as any);
    const router = { createUrlTree: ([ruta]: string[], opciones = {}) => ({ ruta, ...opciones }) };
    const storage = { getCurrentToken: jasmine.createSpy('getCurrentToken').and.returnValue('activo') };
    const guard = new LicenseGuard(router as any, licencia, storage as any,
      { isTokenActive: () => true, getRoles: () => roles } as any, { permiteRuta: () => false } as any);
    const abrir = () => firstValueFrom(guard.canActivate(route, estadoRuta) as Observable<unknown>);
    return { http, abrir, licencia, storage };
  }

  it('permite reintentar un fallo transitorio y abre Caja cuando la consulta se recupera', async () => {
    const { http, abrir } = preparar();
    http.get.and.returnValues(throwError(() => new Error('Sin respuesta')), of(permiso));
    expect(await abrir()).toEqual(destino('licencia-no-disponible'));
    expect(http.get.calls.first().args[1].context.get(ERROR_GESTIONADO_POR_CONSUMIDOR)).toBeTrue();
    expect(await abrir()).toBeTrue();
    expect(http.get).toHaveBeenCalledTimes(2);
  });

  it('explica la denegación al cajero y conserva la licencia resuelta', async () => {
    const { http, abrir } = preparar();
    http.get.and.returnValue(of({ Success: true, Data: { Caracteristicas: [] } }));
    expect(await abrir()).toEqual(destino('sin-licencia'));
    expect(await abrir()).toEqual(destino('sin-licencia'));
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('mantiene el panel del administrador como destino cuando falta la característica', async () => {
    const { http, abrir } = preparar(['admin']);
    http.get.and.returnValue(of({ Success: true, Data: { Caracteristicas: [] } }));
    expect(await abrir()).toEqual({ ruta: '/dashboard' });
  });

  it('respeta la redirección del interceptor si la sesión terminó durante la consulta', async () => {
    const { http, abrir, storage } = preparar();
    const consulta = new Subject();
    http.get.and.returnValue(consulta);
    const pendiente = abrir();
    storage.getCurrentToken.and.returnValue(null);
    consulta.error(new Error('Suscripción bloqueada'));
    expect(await pendiente).toBeFalse();
  });

  it('reconoce la sucursal legacy únicamente cuando la respuesta correcta contiene Data null', async () => {
    const { http, abrir } = preparar();
    const invalidas = [
      null,
      { Error: 'Servicio interrumpido' },
      { Success: true },
      { Success: false, Data: null },
      { Success: true, Data: {} },
      { Success: true, Data: { Caracteristicas: [{ Codigo: feature, Habilitada: 'false' }] } },
    ];
    for (const respuesta of invalidas) {
      http.get.and.returnValue(of(respuesta));
      expect(await abrir()).toEqual(destino('licencia-no-disponible'));
    }
    http.get.and.returnValue(of({ Success: true, Data: null }));
    expect(await abrir()).toBeTrue();
    expect(await abrir()).toBeTrue();
    expect(http.get).toHaveBeenCalledTimes(invalidas.length + 1);
  });

  it('el fallo de una consulta anterior no invalida la licencia de la sucursal actual', async () => {
    const { http, abrir, licencia } = preparar();
    const anterior = new Subject();
    http.get.and.returnValues(anterior, of(permiso));
    const pendiente = abrir();
    licencia.invalidar();
    expect(await abrir()).toBeTrue();
    anterior.error(new Error('Sucursal anterior sin respuesta'));
    expect(await pendiente).toEqual(destino('licencia-no-disponible'));
    expect(await abrir()).toBeTrue();
    expect(http.get).toHaveBeenCalledTimes(2);
  });
});
