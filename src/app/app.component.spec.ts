import { NavigationEnd } from '@angular/router';
import { NEVER, Subject } from 'rxjs';
import { AppComponent } from './app.component';
import { TenantTextCatalogService } from './services/localization/tenant-text-catalog.service';
import { StorageService } from './services/storage.service';

describe('Arranque de La Comanda', () => {
  function crearApp() {
    const events = new Subject<NavigationEnd>();
    const storage = { getCurrentSession: () => null } as StorageService;
    const catalogo = new TenantTextCatalogService(storage);
    const actividad = jasmine.createSpyObj('actividad', ['start', 'stop', 'iniciar', 'detener']);
    const app = new AppComponent(
      actividad, { events } as any, storage, { updateVariable_TituloHeader: () => {} } as any,
      { headerVisible$: NEVER } as any, { isDown$: NEVER } as any, { detenerVigilancia: () => {} } as any,
      actividad, {} as any, { permiteRuta: () => false } as any, catalogo, actividad, actividad,
      { estado$: NEVER, pendientes$: NEVER } as any,
      { creada$: NEVER, resuelta$: NEVER, esAprobador$: NEVER, iniciar: () => {}, detener: () => {} } as any,
      actividad, {} as any, {} as any, actividad, {} as any,
      { nuevas$: NEVER, iniciar: () => {}, detener: () => {} } as any,
    );
    return { app, catalogo, events };
  }

  it('reserva la cabecera para las páginas internas durante el retorno de Keycloak', async () => {
    const { app, catalogo, events } = crearApp();
    expect(app.esRutaPublicaActual).toBeTrue();
    await app.ngOnInit();

    const retorno = '/iniciar-sesion#state=ejemplo';
    events.next(new NavigationEnd(1, retorno, retorno));
    catalogo.setCulture('es-PE');
    expect(app.esRutaPublicaActual).toBeTrue();

    events.next(new NavigationEnd(2, '/dashboard', '/dashboard'));
    expect(app.esRutaPublicaActual).toBeFalse();
    expect(catalogo.get('openMenu')).toBe('Abrir menú');
  });

  it('conserva el idioma del navegador mientras se elige la sucursal', async () => {
    spyOnProperty(navigator, 'language', 'get').and.returnValue('es-PE');
    const { app, catalogo } = crearApp();
    await app.ngOnInit();
    expect(catalogo.culture).toBe('es-PE');
  });

  it('inicializa la cultura de la sucursal si la sesión carece de preferencia personal', () => {
    const storage = { getCurrentSession: () => ({ CulturaTenant: 'es-ES' }) } as StorageService;
    expect(new TenantTextCatalogService(storage).culture).toBe('es-ES');
  });
});
