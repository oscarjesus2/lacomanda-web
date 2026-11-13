import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import * as moment from 'moment';
import { Observable } from 'rxjs';
import { FechaFiltro } from '../shared/fechas/fecha-filtro';
import { EntradaCompraService } from './entrada-compra.service';
import { PorcionamientoService } from './porcionamiento.service';
import { ProduccionService } from './produccion.service';
import { SalidaInternaService } from './salida-interna.service';
import { TransferenciaAlmacenService } from './transferencia-almacen.service';

describe('Filtros de fecha de almacén', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const servicios: Array<{
    tipo: Type<{ listar(filtro: { FechaInicio: FechaFiltro; FechaFin: FechaFiltro }): Observable<unknown> }>;
    ruta: string;
  }> = [
    { tipo: EntradaCompraService, ruta: '/compras-almacen' },
    { tipo: SalidaInternaService, ruta: '/salidas-internas' },
    { tipo: TransferenciaAlmacenService, ruta: '/transferencias-almacen' },
    { tipo: PorcionamientoService, ruta: '/porcionamientos' },
    { tipo: ProduccionService, ruta: '/producciones' }
  ];

  for (const servicio of servicios) {
    it(`envía las fechas elegidas en el calendario en ${servicio.ruta}`, () => {
      TestBed.inject(servicio.tipo).listar({
        FechaInicio: moment('2026-10-01', 'YYYY-MM-DD'),
        FechaFin: moment('2026-11-13', 'YYYY-MM-DD')
      }).subscribe();

      const request = http.expectOne(req => req.url.endsWith(servicio.ruta));
      expect(request.request.params.get('FechaInicio')).toBe('2026-10-01');
      expect(request.request.params.get('FechaFin')).toBe('2026-11-13');
      request.flush({ Success: true, Data: [] });
    });
  }

  it('conserva el día de las fechas nativas y permite filtros sin fecha', () => {
    const service = TestBed.inject(EntradaCompraService);
    service.listar({ FechaInicio: new Date(2026, 9, 1), FechaFin: null }).subscribe();

    const request = http.expectOne(req => req.url.endsWith('/compras-almacen'));
    expect(request.request.params.get('FechaInicio')).toBe('2026-10-01');
    expect(request.request.params.has('FechaFin')).toBeFalse();
    request.flush({ Success: true, Data: [] });
  });
});
