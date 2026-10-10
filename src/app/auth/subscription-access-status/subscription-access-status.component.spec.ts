import {
  SubscriptionAccessCode,
  SubscriptionAccessStatusComponent,
} from './subscription-access-status.component';

describe('SubscriptionAccessStatusComponent', () => {
  afterEach(() => {
    history.replaceState({}, '', '/');
  });

  const createComponent = (
    errorCode?: SubscriptionAccessCode,
    businessName: string | null = 'Lima',
  ) => {
    const headerService = {
      hideHeader: jasmine.createSpy('hideHeader'),
    };
    const router = {
      getCurrentNavigation: () => errorCode
        ? { extras: { state: { businessName, errorCode } } }
        : null,
    };
    const component = new SubscriptionAccessStatusComponent(
      headerService as any,
      router as any,
    );
    return { component, headerService };
  };

  const cases: Array<{
    code: SubscriptionAccessCode;
    title: string;
    action: string;
  }> = [
    {
      code: 'SUBSCRIPTION_PAYMENT_REQUIRED',
      title: 'Tu acceso ya está preparado',
      action: 'Revisar pago en el Portal',
    },
    {
      code: 'SUBSCRIPTION_EXPIRED',
      title: 'Tu suscripción necesita renovarse',
      action: 'Renovar en el Portal',
    },
    {
      code: 'SUBSCRIPTION_CANCELLED',
      title: 'La suscripción fue cancelada',
      action: 'Reactivar en el Portal',
    },
    {
      code: 'SUBSCRIPTION_NOT_ACTIVE',
      title: 'Tu suscripción todavía no está activa',
      action: 'Revisar activación en el Portal',
    },
  ];

  for (const testCase of cases) {
    it(`presenta el contenido de ${testCase.code}`, () => {
      const { component } = createComponent(testCase.code);

      expect(component.errorCode).toBe(testCase.code);
      expect(component.content.title).toBe(testCase.title);
      expect(component.content.portalAction).toBe(testCase.action);
      expect(component.summary).toContain('Lima');
    });
  }

  it('oculta la cabecera operativa', () => {
    const { component, headerService } = createComponent(
      'SUBSCRIPTION_PAYMENT_REQUIRED',
    );

    component.ngOnInit();

    expect(headerService.hideHeader).toHaveBeenCalled();
  });

  it('usa el mensaje de activación pendiente al abrir la ruta directamente', () => {
    const { component } = createComponent();

    expect(component.businessName).toBeNull();
    expect(component.errorCode).toBe('SUBSCRIPTION_NOT_ACTIVE');
    expect(component.portalUrl).toBeTruthy();
  });
});
