import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { KardexAlmacenService } from './kardex-almacen.service';

describe('KardexAlmacenService', () => {
  let service: KardexAlmacenService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = TestBed.inject(KardexAlmacenService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('envía el artículo con el nombre esperado por la API', () => {
    service.consultar(2, 198, '2026-08-01', '2026-08-11').subscribe();

    const request = httpTestingController.expectOne(request =>
      request.url === `${environment.apiUrl}/kardex-almacen`
    );

    expect(request.request.params.get('idArticulo')).toBe('198');
    expect(request.request.params.has('idProducto')).toBeFalse();
    request.flush({ Success: true, Message: '', Data: null });
  });
});
