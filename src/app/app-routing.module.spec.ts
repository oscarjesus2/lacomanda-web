import { TestBed } from '@angular/core/testing';
import { ROUTES } from '@angular/router';
import { AppRoutingModule } from './app-routing.module';
import { CajaOfflineComponent } from './offline/caja-offline.component';

describe('Rutas de contingencia', () => {
  it('incluye la pantalla de regularización en la carga inicial para poder abrirla durante un corte', () => {
    TestBed.configureTestingModule({ imports: [AppRoutingModule] });

    const ruta = TestBed.inject(ROUTES).flat().find(config => config.path === 'offline');

    expect(ruta?.component).toBe(CajaOfflineComponent);
  });
});
