import { HttpErrorResponse } from '@angular/common/http';

import { ApiRequestInterceptor } from './angular.http.interceptor';

describe('ApiRequestInterceptor - acceso por suscripción', () => {
  const blockedCodes = [
    'SUBSCRIPTION_PAYMENT_REQUIRED',
    'SUBSCRIPTION_EXPIRED',
    'SUBSCRIPTION_CANCELLED',
    'SUBSCRIPTION_NOT_ACTIVE',
  ];

  for (const errorCode of blockedCodes) {
    it(`muestra la vista específica para ${errorCode}`, async () => {
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
          ErrorCode: errorCode,
          Message: 'La suscripción no permite el acceso.',
        },
      });

      (interceptor as any).handleSubscriptionAccessError(error);
      await Promise.resolve();

      expect(storage.logout).toHaveBeenCalledOnceWith(false);
      expect(router.navigate).toHaveBeenCalledOnceWith(
        ['/estado-suscripcion'],
        { state: { businessName: 'Lima', errorCode } },
      );
    });
  }
});
