import { HttpErrorResponse } from '@angular/common/http';

import { ApiRequestInterceptor } from './angular.http.interceptor';

describe('ApiRequestInterceptor - pago pendiente', () => {
  it('cierra la sesión sin rebotar al login y muestra la vista informativa', async () => {
    const storage = {
      getCurrentNombreSucursal: jasmine
        .createSpy('getCurrentNombreSucursal')
        .and.returnValue('Lima'),
      logout: jasmine.createSpy('logout'),
    };
    const router = {
      url: '/iniciar-sesion',
      navigate: jasmine.createSpy('navigate').and.resolveTo(true),
    };
    const interceptor = new ApiRequestInterceptor(
      storage as any,
      {} as any,
      { closeAll: jasmine.createSpy('closeAll') } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      router as any,
    );
    const error = new HttpErrorResponse({
      status: 402,
      error: {
        ErrorCode: 'SUBSCRIPTION_PAYMENT_REQUIRED',
        Message: 'La suscripción está pendiente de pago.',
      },
    });

    (interceptor as any).handleSubscriptionAccessError(error);
    await Promise.resolve();

    expect(storage.logout).toHaveBeenCalledOnceWith(false);
    expect(router.navigate).toHaveBeenCalledOnceWith(
      ['/acceso-pendiente'],
      { state: { businessName: 'Lima' } },
    );
  });
});
