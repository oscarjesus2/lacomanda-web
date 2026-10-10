import { SubscriptionPaymentPendingComponent } from './subscription-payment-pending.component';

describe('SubscriptionPaymentPendingComponent', () => {
  afterEach(() => {
    history.replaceState({}, '', '/');
  });

  it('muestra el negocio recibido y oculta la cabecera operativa', () => {
    const headerService = {
      hideHeader: jasmine.createSpy('hideHeader'),
    };
    const router = {
      getCurrentNavigation: () => ({
        extras: { state: { businessName: 'Lima' } },
      }),
    };

    const component = new SubscriptionPaymentPendingComponent(
      headerService as any,
      router as any,
    );
    component.ngOnInit();

    expect(component.businessName).toBe('Lima');
    expect(headerService.hideHeader).toHaveBeenCalled();
  });

  it('funciona con un mensaje genérico al abrir la ruta directamente', () => {
    const router = { getCurrentNavigation: () => null };
    const component = new SubscriptionPaymentPendingComponent(
      { hideHeader: () => undefined } as any,
      router as any,
    );

    expect(component.businessName).toBeNull();
    expect(component.portalUrl).toContain('portal');
  });
});
