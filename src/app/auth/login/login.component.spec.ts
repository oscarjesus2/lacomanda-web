import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';

import { LoginComponent } from './login.component';

describe('LoginComponent - progreso del retorno de Keycloak', () => {
  let component: LoginComponent;
  let indicatorHandle: {
    update: jasmine.Spy;
    close: jasmine.Spy;
  };
  let processingIndicator: { begin: jasmine.Spy };
  let spinner: { show: jasmine.Spy; hide: jasmine.Spy };
  let router: { navigateByUrl: jasmine.Spy };
  let keycloak: { completeLogin: jasmine.Spy };
  let tenantService: { getTenant: jasmine.Spy };

  beforeEach(() => {
    indicatorHandle = {
      update: jasmine.createSpy('update'),
      close: jasmine.createSpy('close'),
    };
    processingIndicator = {
      begin: jasmine.createSpy('begin').and.returnValue(indicatorHandle),
    };
    spinner = {
      show: jasmine.createSpy('show'),
      hide: jasmine.createSpy('hide'),
    };
    router = {
      navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true),
    };
    keycloak = {
      completeLogin: jasmine.createSpy('completeLogin').and.resolveTo(null),
    };
    tenantService = {
      getTenant: jasmine.createSpy('getTenant').and.returnValue(
        of({ Success: true, Data: [] }),
      ),
    };

    const textCatalog = {
      get: jasmine.createSpy('get').and.callFake((key: string) => key),
      setCulture: jasmine.createSpy('setCulture'),
    };

    component = new LoginComponent(
      {} as any,
      spinner as any,
      processingIndicator as any,
      new FormBuilder(),
      router as any,
      { snapshot: { queryParamMap: { get: () => null } } } as any,
      {} as any,
      keycloak as any,
      {} as any,
      {} as any,
      tenantService as any,
      {
        showError: jasmine.createSpy('showError'),
        showWarning: jasmine.createSpy('showWarning'),
      } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      textCatalog as any,
    );
  });

  afterEach(() => {
    localStorage.removeItem('pendingLogin');
    history.replaceState({}, '', '/');
  });

  it('muestra el indicador apenas detecta el callback de Keycloak', async () => {
    localStorage.setItem('pendingLogin', JSON.stringify({
      TenantId: 'tenant-1',
      Sucursal: 'Sucursal',
      Cultura: 'es-PE',
    }));
    history.replaceState({}, '', '/iniciar-sesion?code=code-1&state=state-1');

    const completed = await (component as any).tryCompleteRedirectLogin();

    expect(processingIndicator.begin).toHaveBeenCalledWith({
      title: 'validatingLoginTitle',
      message: 'validatingLoginMessage',
      hint: 'loginProcessingHint',
      icon: 'login',
    });
    expect(keycloak.completeLogin).toHaveBeenCalledWith('tenant-1');
    expect(indicatorHandle.close).toHaveBeenCalled();
    expect(completed).toBeFalse();
  });

  it('actualiza un único indicador mientras avanza el inicio de sesión', () => {
    (component as any).iniciarIndicadorLogin();
    (component as any).actualizarIndicadorLogin(
      'Preparando tu sesión',
      'Cargando permisos',
      'verified_user',
    );

    expect(processingIndicator.begin).toHaveBeenCalledTimes(1);
    expect(indicatorHandle.update).toHaveBeenCalledWith({
      title: 'Preparando tu sesión',
      message: 'Cargando permisos',
      icon: 'verified_user',
    });
  });

  it('mantiene el indicador hasta que termina la navegación', async () => {
    (component as any).iniciarIndicadorLogin();

    await (component as any).navegarTrasLogin('/dashboard');

    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    expect(indicatorHandle.close).toHaveBeenCalled();
    expect(spinner.hide).toHaveBeenCalled();
  });

  it('limpia el indicador si el componente se destruye', () => {
    (component as any).iniciarIndicadorLogin();

    component.ngOnDestroy();

    expect(indicatorHandle.close).toHaveBeenCalledTimes(1);
  });
});
