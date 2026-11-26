import { RoleGuard } from './role.guard';
import { LicenseGuard } from './license.guard';

describe('Acceso a Caja y Mozo durante un corte', () => {
  const router = { createUrlTree: (ruta: string[]) => ruta[0] };
  const ruta = { data: { feature: 'OperacionCaja', roles: ['caja'] } } as any;
  const almacenamiento = { getCurrentToken: jasmine.createSpy() };
  const licencia = { obtenerEstado: jasmine.createSpy() };
  const auth = { isTokenActive: () => false };
  beforeEach(() => almacenamiento.getCurrentToken.calls.reset());

  function guards(activa: boolean, requiereSeleccion = false) {
    const local = { activa, requiereSeleccion, rutaVenta: '/mozo', permiteRuta: (url: string) => activa && url === '/mozo' };
    return [
      new RoleGuard(router as any, almacenamiento as any, auth as any, local as any),
      new LicenseGuard(router as any, licencia as any, almacenamiento as any, auth as any, local as any),
    ];
  }

  it('abre Mozo sin token online sólo para el operador local verificado', () => {
    for (const guard of guards(true)) {
      expect(guard.canActivate(ruta, { url: '/mozo' } as any)).toBe(true);
      expect(guard.canActivate(ruta, { url: '/caja' } as any)).toBe('/mozo' as any);
      expect(guard.canActivate(ruta, { url: '/administracion' } as any)).toBe('/mozo' as any);
    }
    expect(licencia.obtenerEstado).not.toHaveBeenCalled();
    expect(almacenamiento.getCurrentToken).not.toHaveBeenCalled();
  });

  it('al recargar pide seleccionar operador y sin marcador exige el acceso online', () => {
    for (const guard of guards(false, true)) {
      expect(guard.canActivate(ruta, { url: '/caja' } as any)).toBe('/offline' as any);
    }
    for (const guard of guards(false)) {
      expect(guard.canActivate(ruta, { url: '/caja' } as any)).toBe('/iniciar-sesion' as any);
    }
  });
});
