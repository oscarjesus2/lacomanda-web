import { HttpErrorResponse } from '@angular/common/http';

import { ApiRequestInterceptor } from './angular.http.interceptor';

describe('ApiRequestInterceptor - errores de validación', () => {
  it('presenta el mensaje de la excepción enviada por el backend', () => {
    const notification = { showWarning: jasmine.createSpy('showWarning') };
    const interceptor = new ApiRequestInterceptor(
      {} as any, {} as any, {} as any, notification as any,
      {} as any, {} as any, {} as any, {} as any,
    );
    const message = 'No se puede eliminar el artículo porque está asociado a otros registros.';
    const error = new HttpErrorResponse({
      status: 400,
      error: { ErrorCode: 'DELETE_NOT_ALLOWED_DUE_TO_REFERENCES', Message: message },
    });

    (interceptor as any).presentError(error);

    expect(notification.showWarning).toHaveBeenCalledOnceWith(message);
  });
});

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
