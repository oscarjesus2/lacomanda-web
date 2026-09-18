import { HttpClient } from '@angular/common/http';
import { NgZone } from '@angular/core';
import { of, throwError } from 'rxjs';
import { Session } from '../models/session.models';
import { Usuario } from '../models/usuario.models';
import { DeviceIdentifierService } from './device-identifier.service';
import { SesionUsuarioService } from './sesion-usuario.service';
import { StorageService } from './storage.service';

describe('SesionUsuarioService', () => {
  let http: jasmine.SpyObj<HttpClient>;
  let storage: jasmine.SpyObj<StorageService>;
  let deviceIdentifier: jasmine.SpyObj<DeviceIdentifierService>;
  let session: Session;
  let service: SesionUsuarioService;

  beforeEach(() => {
    http = jasmine.createSpyObj<HttpClient>('HttpClient', ['post', 'delete']);
    storage = jasmine.createSpyObj<StorageService>(
      'StorageService', ['getCurrentSession', 'getCurrentToken', 'logout'],
    );
    deviceIdentifier = jasmine.createSpyObj<DeviceIdentifierService>(
      'DeviceIdentifierService', ['getIdentifier'],
    );
    session = new Session('token-1', 'refresh-1', new Usuario(), 'est-1', 'tenant', 'Sucursal', 'es');
    storage.getCurrentSession.and.returnValue(session);
    storage.getCurrentToken.and.returnValue(session.Token);
    deviceIdentifier.getIdentifier.and.returnValue('est-1');
    service = new SesionUsuarioService(
      http, storage, deviceIdentifier, new NgZone({ enableLongStackTrace: false }),
    );
    spyOn<any>(service, 'conectar').and.resolveTo();
  });

  it('registra una sola vez aunque el token se renueve o cambie la ruta', async () => {
    http.post.and.returnValue(of({ Data: { SesionAnteriorCerrada: false } } as any));

    await service.registrarAhora();
    session.Token = 'token-renovado';
    await service.registrarAhora();
    service.iniciar();
    await Promise.resolve();

    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('permite reintentar si el registro falla', async () => {
    http.post.and.returnValue(throwError(() => new Error('sin conexión')));

    await expectAsync(service.registrarAhora()).toBeRejected();
    http.post.and.returnValue(of({ Data: { SesionAnteriorCerrada: false } } as any));
    await service.registrarAhora();

    expect(http.post).toHaveBeenCalledTimes(2);
  });
});
