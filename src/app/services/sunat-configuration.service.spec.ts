import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { SunatConfigurationService } from './sunat-configuration.service';

describe('SunatConfigurationService', () => {
  let service: SunatConfigurationService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(SunatConfigurationService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('envía el código de establecimiento con el nombre esperado por la API', () => {
    const certificate = new File(['certificate'], 'certificado.p12', {
      type: 'application/x-pkcs12',
    });

    service
      .save({
        CodigoEstablecimientoSunat: '0000',
        UsuarioSol: 'MODDATOS',
        ClaveSol: 'clave-sol',
        ClaveCertificado: 'clave-certificado',
        Certificado: certificate,
      })
      .subscribe();

    const request = httpTestingController.expectOne(
      `${environment.apiUrl}/configuracion/sunat`,
    );
    const formData = request.request.body as FormData;
    const sentCertificate = formData.get('Certificado') as File;

    expect(request.request.method).toBe('PUT');
    expect(formData.get('CodigoEstablecimientoSunat')).toBe('0000');
    expect(formData.has('Ubigeo')).toBeFalse();
    expect(sentCertificate.name).toBe(certificate.name);
    expect(sentCertificate.size).toBe(certificate.size);
    request.flush({ Success: true, Message: '', Data: null });
  });
});
