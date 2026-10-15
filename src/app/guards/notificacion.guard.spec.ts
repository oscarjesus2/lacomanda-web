import { NotificacionGuard } from './notificacion.guard';

describe('NotificacionGuard', () => {
  it('permite abrir a un gerente desde administración sin exigir estación de caja', () => {
    const router = { createUrlTree: jasmine.createSpy() };
    const guard = new NotificacionGuard(router as any, { getCurrentToken: () => 'token' } as any, { isTokenActive: () => true } as any);
    expect(guard.canActivate({} as any, { url: '/notificaciones/n1' } as any)).toBeTrue();
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('sin sesión conserva el enlace para después de autenticarse', () => {
    const router = { createUrlTree: jasmine.createSpy().and.returnValue('login') };
    const guard = new NotificacionGuard(router as any, { getCurrentToken: () => null } as any, { isTokenActive: () => false } as any);
    expect(guard.canActivate({} as any, { url: '/notificaciones/n1' } as any)).toBe('login' as any);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/iniciar-sesion'], { queryParams: { returnUrl: '/notificaciones/n1' } });
  });
});
