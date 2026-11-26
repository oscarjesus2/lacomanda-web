import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { LoginComponent } from './login.component';
import { EstacionTipoEnum } from '../../enums/enum';
import { RUTA_REGULARIZAR_CAJA } from '../../offline/ruta-regularizacion';

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
      { destinoTrasLogin: async (ruta: string) => ruta } as any,
    );
  });

  afterEach(() => {
    localStorage.removeItem('pendingLogin');
    history.replaceState({}, '', '/');
  });

  it('sincroniza la dirección ya depurada por Keycloak antes de abrir el puesto', async () => {
    const pendiente = { TenantId: 'tenant-1', Sucursal: 'Lima', Cultura: 'es-PE' };
    const limpia = '/iniciar-sesion?returnUrl=%2Fcaja&origen=pwa#ayuda';
    const callback = limpia.replace('#ayuda', '#state=prueba&session_state=sesion&code=ficticio&ayuda');
    localStorage.setItem('pendingLogin', JSON.stringify(pendiente));
    history.replaceState({}, '', callback);
    (router as any).url = callback;
    const tokens = { token: 'token-1', refreshToken: 'refresh-1' };
    keycloak.completeLogin.and.callFake(async () => {
      history.replaceState({}, '', limpia);
      return tokens;
    });
    const completar = spyOn<any>(component, 'completarSesion').and.resolveTo();

    expect(await (component as any).tryCompleteRedirectLogin()).toBeTrue();

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith(limpia, { replaceUrl: true });
    expect(router.navigateByUrl).toHaveBeenCalledBefore(completar);
    expect(completar).toHaveBeenCalledOnceWith(tokens, pendiente);
    expect(await (component as any).tryCompleteRedirectLogin()).toBeFalse();
    expect(keycloak.completeLogin).toHaveBeenCalledTimes(1);
  });

  it('regresa a regularizar en la estación de caja tanto con sesión vigente como tras Keycloak', () => {
    const login = component as any;
    spyOn(login.route.snapshot.queryParamMap, 'get').and.returnValue(RUTA_REGULARIZAR_CAJA);
    expect(login.destinoCajaTrasLogin('/dashboard', EstacionTipoEnum.CAJA)).toBe(RUTA_REGULARIZAR_CAJA);
    expect(login.destinoCajaTrasLogin('/caja', EstacionTipoEnum.CAJA, RUTA_REGULARIZAR_CAJA)).toBe(RUTA_REGULARIZAR_CAJA);
    expect(login.destinoCajaTrasLogin('/mozo', EstacionTipoEnum.MOZO, RUTA_REGULARIZAR_CAJA)).toBe('/mozo');
    expect(login.destinoCajaTrasLogin('/caja', EstacionTipoEnum.CAJA, '/otra-ruta')).toBe('/caja');
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
    expect(completed).toBeTrue();
    expect(component.showSelector).toBeTrue();
  });

  it('conserva la vista de pago pendiente y no reinicia Keycloak', async () => {
    localStorage.setItem('pendingLogin', JSON.stringify({
      TenantId: 'tenant-1',
      Sucursal: 'Lima',
      Cultura: 'es-PE',
    }));
    history.replaceState({}, '', '/iniciar-sesion?code=code-1&state=state-1');
    keycloak.completeLogin.and.resolveTo({
      token: 'token-1',
      refreshToken: 'refresh-1',
    });
    spyOn<any>(component, 'completarSesion').and.callFake(async () => {
      throw new HttpErrorResponse({
        status: 402,
        error: {
          ErrorCode: 'SUBSCRIPTION_PAYMENT_REQUIRED',
          Message: 'La suscripción está pendiente de pago.',
        },
      });
    });

    const completed = await (component as any).tryCompleteRedirectLogin();

    expect(completed).toBeTrue();
    expect(tenantService.getTenant).not.toHaveBeenCalled();
    expect(indicatorHandle.close).toHaveBeenCalled();
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

    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard', { replaceUrl: true });
    expect(indicatorHandle.close).toHaveBeenCalled();
    expect(spinner.hide).toHaveBeenCalled();
  });

  it('limpia el indicador si el componente se destruye', () => {
    (component as any).iniciarIndicadorLogin();

    component.ngOnDestroy();

    expect(indicatorHandle.close).toHaveBeenCalledTimes(1);
  });

  it('mantiene visible el acceso online cuando el router cancela o falla al abrir el puesto', async () => {
    router.navigateByUrl.and.resolveTo(false);
    await (component as any).navegarTrasLogin('/caja');
    expect(component.loginError).toBe('onlineWorkspaceUnavailable');
    expect(component.accesoDenegado).toBeFalse();

    router.navigateByUrl.and.rejectWith(new Error('No se pudo activar la ruta'));
    await (component as any).navegarTrasLogin('/caja');
    expect(component.loginError).toBe('onlineWorkspaceUnavailable');
  });

  it('explica la denegación aun cuando el router completa una redirección al mismo login', async () => {
    const login = component as any;
    (router as any).url = '/iniciar-sesion?acceso=sin-licencia';
    spyOn(login.route.snapshot.queryParamMap, 'get').and.callFake((key: string) => key === 'acceso' ? 'sin-licencia' : null);
    await login.navegarTrasLogin('/caja');
    expect(component.loginError).toBe('onlineWorkspaceNotLicensed');
    expect(component.accesoDenegado).toBeTrue();
  });

  it('reutiliza la sesión online y vuelve a leer la estación al reintentar', async () => {
    const login = component as any;
    const session = { Token: 'ejemplo', User: {} };
    login.CurrentIP = 'pc-prueba';
    login.storageService = { getCurrentSession: () => session, setCurrentSession: () => undefined };
    login.keycloakAuth = { isTokenActive: () => true };
    login.estacionService = { getAll: () => of({ Success: true, Data: {} }) };
    await component.reintentarOnline();
    expect(component.loginError).toBe('couldNotLoadStations');
    expect(router.navigateByUrl).not.toHaveBeenCalled();

    login.estacionService.getAll = () => throwError(() => new HttpErrorResponse({ status: 503 }));
    await component.reintentarOnline();
    expect(component.loginError).toBe('couldNotLoadStations (HTTP 503)');

    login.estacionService.getAll = () => of({ Success: true, Data: [null, { IdentificadorUnico: 'PC-PRUEBA', Tipo: EstacionTipoEnum.CAJA }] });
    await component.reintentarOnline();
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/caja', { replaceUrl: true });
    expect(component.loginError).toBe('');
  });

  it('reintenta la página solicitada cuando ya se identificó la estación y falló la consulta de licencia', async () => {
    const login = component as any;
    login.storageService = { getCurrentSession: () => ({ Token: 'ejemplo' }) };
    login.keycloakAuth = { isTokenActive: () => true };
    const query = new URLSearchParams({ acceso: 'licencia-no-disponible', returnUrl: '/caja' });
    spyOn(login.route.snapshot.queryParamMap, 'get').and.callFake((key: string) => query.get(key));

    await component.reintentarOnline();

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/caja', { replaceUrl: true });
    expect(component.isSubmitting).toBeFalse();
  });

  it('no considera completa una propuesta que todavía no fue guardada', () => {
    const propuesta = {
      IdConfig: 0,
      RazonSocial: 'La Comanda',
      NombreComercial: 'La Comanda - Lima',
      Direccion: 'Calle X',
      Telefono: '+51926612691',
      NumeroIdentificacion: '20616513339',
      IdTipoIdentidad: 'RUC',
    };

    expect((component as any).isConfigValid(propuesta)).toBeFalse();
  });

  it('acepta una configuración persistida con los datos obligatorios', () => {
    const configuracion = {
      IdConfig: 1,
      RazonSocial: 'La Comanda',
      NombreComercial: 'La Comanda - Lima',
      Direccion: 'Calle X',
      Telefono: '+51926612691',
      NumeroIdentificacion: '20616513339',
      IdTipoIdentidad: 'RUC',
    };

    expect((component as any).isConfigValid(configuracion)).toBeTrue();
  });
});
