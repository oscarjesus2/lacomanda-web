import { NgZone } from '@angular/core';
import { of } from 'rxjs';
import { TrabajoImpresion } from '../models/trabajo-impresion.models';
import { AgenteImpresionPedidosService } from './agente-impresion-pedidos.service';
import { DeviceCapabilitiesService } from './device-capabilities.service';
import { QzTrayV224Service } from './qz-tray-v224.service';
import { StorageService } from './storage.service';
import { TrabajosImpresionService } from './trabajos-impresion.service';

describe('AgenteImpresionPedidosService', () => {
  let service: AgenteImpresionPedidosService;
  let trabajos: jasmine.SpyObj<TrabajosImpresionService>;
  let qz: jasmine.SpyObj<QzTrayV224Service>;

  const trabajo: TrabajoImpresion = {
    IdTrabajoImpresion: 41,
    TokenReclamo: 'token-41',
    IdPedido: 9,
    NroCuenta: 1,
    NombreImpresora: 'COCINA',
    Documento: 'JVBERi0xLjQ=',
    Intento: 1,
    EsPrueba: false,
  };

  beforeEach(() => {
    trabajos = jasmine.createSpyObj<TrabajosImpresionService>(
      'TrabajosImpresionService',
      ['reclamar', 'confirmar', 'fallar'],
    );
    qz = jasmine.createSpyObj<QzTrayV224Service>(
      'QzTrayV224Service',
      ['isQzTrayRunning', 'printPDFDesdeColaServidor'],
    );

    service = new AgenteImpresionPedidosService(
      {} as StorageService,
      trabajos,
      qz,
      {} as NgZone,
      {} as DeviceCapabilitiesService,
    );
  });

  it('confirma el trabajo cuando QZ lo entrega a la impresora resuelta', async () => {
    qz.printPDFDesdeColaServidor.and.resolveTo(true);
    trabajos.confirmar.and.returnValue(of({} as any));

    const resultado = await (service as any).imprimir(trabajo);

    expect(resultado).toBeTrue();
    expect(qz.printPDFDesdeColaServidor).toHaveBeenCalledOnceWith(
      trabajo.Documento,
      trabajo.NombreImpresora,
      true,
    );
    expect(trabajos.confirmar).toHaveBeenCalledOnceWith(
      trabajo.IdTrabajoImpresion,
      { TokenReclamo: trabajo.TokenReclamo },
    );
    expect(trabajos.fallar).not.toHaveBeenCalled();
  });

  it('libera el trabajo en el backend cuando QZ no acepta la impresión', async () => {
    qz.printPDFDesdeColaServidor.and.resolveTo(false);
    trabajos.fallar.and.returnValue(of({} as any));

    const resultado = await (service as any).imprimir(trabajo);

    expect(resultado).toBeFalse();
    expect(trabajos.confirmar).not.toHaveBeenCalled();
    expect(trabajos.fallar).toHaveBeenCalledOnceWith(
      trabajo.IdTrabajoImpresion,
      {
        TokenReclamo: trabajo.TokenReclamo,
        Error: 'QZ no confirmo la impresion del documento.',
      },
    );
  });

  it('exige la impresora exacta cuando el trabajo es una prueba', async () => {
    qz.printPDFDesdeColaServidor.and.resolveTo(true);
    trabajos.confirmar.and.returnValue(of({} as any));

    const resultado = await (service as any).imprimir({
      ...trabajo,
      EsPrueba: true,
    });

    expect(resultado).toBeTrue();
    expect(qz.printPDFDesdeColaServidor).toHaveBeenCalledOnceWith(
      trabajo.Documento,
      trabajo.NombreImpresora,
      false,
    );
  });

  it('declara que el respaldo web admite pruebas al reclamar', async () => {
    const storage = jasmine.createSpyObj<StorageService>(
      'StorageService',
      ['getCurrentToken', 'getCurrentIP'],
    );
    storage.getCurrentToken.and.returnValue('token');
    storage.getCurrentIP.and.returnValue('caja-windows-1');
    qz.isQzTrayRunning.and.resolveTo(true);
    trabajos.reclamar.and.returnValue(of({ Data: [] } as any));
    service = new AgenteImpresionPedidosService(
      storage,
      trabajos,
      qz,
      {} as NgZone,
      {} as DeviceCapabilitiesService,
    );
    (service as any).detenido = false;

    await (service as any).procesarPendientes();

    expect(trabajos.reclamar).toHaveBeenCalledOnceWith({
      IdentificadorEstacion: 'caja-windows-1',
      Cantidad: 1,
      QzDisponible: true,
      AdmitePruebas: true,
    });
  });
});
