import { NgZone } from '@angular/core';
import { of } from 'rxjs';
import Swal from 'sweetalert2';
import { DeviceIdentifierService } from './device-identifier.service';
import { EstacionSessionRealtimeService } from './estacion-session-realtime.service';
import { EstacionService } from './estacion.service';
import { StorageService } from './storage.service';

describe('EstacionSessionRealtimeService', () => {
  let storage: jasmine.SpyObj<StorageService>;
  let deviceIdentifier: jasmine.SpyObj<DeviceIdentifierService>;
  let estacionService: jasmine.SpyObj<EstacionService>;

  beforeEach(() => {
    storage = jasmine.createSpyObj<StorageService>(
      'StorageService',
      ['getCurrentToken', 'logout'],
    );
    deviceIdentifier = jasmine.createSpyObj<DeviceIdentifierService>(
      'DeviceIdentifierService',
      [
        'getIdentifier',
        'deleteIdentifier',
        'hasConfirmedStationLink',
        'markStationLinkConfirmed',
      ],
    );
    estacionService = jasmine.createSpyObj<EstacionService>(
      'EstacionService',
      ['verifyDeviceLink'],
    );
    storage.getCurrentToken.and.returnValue('token');
  });

  it('no cierra sesion al recuperar el foco si mantenimiento acaba de crear el identificador', async () => {
    let identifier = '';
    deviceIdentifier.getIdentifier.and.callFake(() => identifier);
    deviceIdentifier.hasConfirmedStationLink.and.returnValue(false);
    estacionService.verifyDeviceLink.and.returnValue(of({
      Success: true,
      Message: '',
      Data: false,
    }));
    const service = createService();
    service.start();
    await flushPromises();

    identifier = 'nuevo-identificador-administrativo';
    window.dispatchEvent(new Event('focus'));
    await flushPromises();

    expect(storage.logout).not.toHaveBeenCalled();
    expect(deviceIdentifier.deleteIdentifier).not.toHaveBeenCalled();
    service.stop();
  });

  it('mantiene el cierre de sesion cuando un vinculo confirmado fue revocado', async () => {
    deviceIdentifier.getIdentifier.and.returnValue('estacion-confirmada');
    deviceIdentifier.hasConfirmedStationLink.and.returnValue(true);
    estacionService.verifyDeviceLink.and.returnValue(of({
      Success: true,
      Message: '',
      Data: false,
    }));
    spyOn(Swal, 'fire').and.resolveTo({} as any);
    const service = createService();
    spyOn<any>(service, 'reiniciarFlujoDeAcceso');

    service.start();
    await flushPromises();

    expect(deviceIdentifier.deleteIdentifier).toHaveBeenCalledOnceWith();
    expect(storage.logout).toHaveBeenCalledOnceWith();
    service.stop();
  });

  function createService(): EstacionSessionRealtimeService {
    return new EstacionSessionRealtimeService(
      storage,
      deviceIdentifier,
      estacionService,
      new NgZone({ enableLongStackTrace: false }),
    );
  }

  async function flushPromises(): Promise<void> {
    await Promise.resolve();
    await new Promise(resolve => setTimeout(resolve, 0));
  }
});
