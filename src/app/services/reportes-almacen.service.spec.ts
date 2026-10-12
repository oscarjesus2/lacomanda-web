import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ReportesAlmacenService } from './reportes-almacen.service';

describe('ReportesAlmacenService', () => {
  let service: ReportesAlmacenService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(ReportesAlmacenService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envía en UTC los límites de los días locales seleccionados', () => {
    service.consultarConsumoTeoricoReal('2026-10-11', '2026-10-12')
      .subscribe();

    const request = http.expectOne(req =>
      req.url.endsWith('/reportes-almacen/consumo-teorico-real')
    );
    expect(request.request.params.get('InstanteDesdeUtc')).toBe(
      new Date(2026, 9, 11).toISOString()
    );
    expect(request.request.params.get('InstanteHastaUtcExclusivo')).toBe(
      new Date(2026, 9, 13).toISOString()
    );
    request.flush({ Success: true, Data: null });
  });
});
