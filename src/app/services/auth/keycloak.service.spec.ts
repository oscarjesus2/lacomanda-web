import { KeycloakService } from './keycloak.service';

describe('Carga de Keycloak para el inicio online', () => {
  it('carga el adaptador y construye un cliente por sucursal', async () => {
    const servicio = new KeycloakService();
    const crear = (realm: string) => servicio['create'](realm);
    const [primero, segundo] = await Promise.all([crear('oeste'), crear('este')]);
    expect(primero).not.toBe(segundo);
    expect(typeof primero.init).toBe('function');
    expect(typeof segundo.login).toBe('function');
  });
  it('mantiene PKCE y el retorno al login al abrir la sesión', async () => {
    const kc = jasmine.createSpyObj('kc', ['init','login']);
    const servicio = new KeycloakService();
    spyOn<any>(servicio, 'create').and.resolveTo(kc);
    await servicio.login('oeste');
    expect(kc.init).toHaveBeenCalledWith({ pkceMethod: 'S256', checkLoginIframe: false });
    expect(kc.login).toHaveBeenCalledWith({ redirectUri: window.location.origin + '/iniciar-sesion' });
  });
});

