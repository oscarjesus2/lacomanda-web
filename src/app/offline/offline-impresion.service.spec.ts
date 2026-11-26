import { of, throwError } from 'rxjs';
import { OfflineImpresionService, IdentidadImpresionLocal } from './offline-impresion.service';

describe('OfflineImpresionService', () => {
  let servicio: OfflineImpresionService;
  let http: jasmine.SpyObj<{ post: (url: string, body: unknown) => any }>;
  let qz: jasmine.SpyObj<{ imprimirComandaOffline: (html: string, impresora: string) => Promise<boolean> }>;
  const identidad: IdentidadImpresionLocal = {
    idOperacion: 'confirmacion', idOperacionPedido: 'pedido', idEstacion: 5, idUsuario: 8, numeroOffline: 'OFF-1',
  };
  const comandas = [
    { impresora: 'COCINA', datos: { area: 'COCINA' } },
    { impresora: 'BAR', datos: { area: 'BAR' } },
  ];

  beforeEach(() => {
    http = jasmine.createSpyObj('http', ['post']);
    http.post.and.callFake((url: string) => url.endsWith('/preparar') ? of('<html>comanda</html>') : of({ resultado: 'registrada' }));
    qz = jasmine.createSpyObj('qz', ['imprimirComandaOffline']);
    qz.imprimirComandaOffline.and.resolveTo(true);
    servicio = Object.create(OfflineImpresionService.prototype) as OfflineImpresionService;
    (servicio as any).localHttp = http;
    (servicio as any).qz = qz;
  });

  it('confirma en caja solo después de imprimir todas las comandas', async () => {
    const resultado = await servicio.imprimir('http://caja:17861', identidad, comandas);
    expect(resultado.estado).toBe('confirmada');
    expect(qz.imprimirComandaOffline).toHaveBeenCalledTimes(2);
    expect(http.post).toHaveBeenCalledWith('http://caja:17861/api/impresiones/confirmar', {
      ...identidad, impresoras: ['COCINA', 'BAR'],
    });
  });

  it('conserva el progreso cuando falla una impresora y reanuda desde esa comanda', async () => {
    qz.imprimirComandaOffline.and.returnValues(Promise.resolve(true), Promise.resolve(false));
    const primero = await servicio.imprimir('http://caja:17861', identidad, comandas);
    expect(primero).toEqual({ estado: 'fallo-impresion', impresorasAceptadas: ['COCINA'], siguienteIndice: 1 });
    expect(http.post.calls.allArgs().some(args => args[0].endsWith('/confirmar'))).toBeFalse();

    qz.imprimirComandaOffline.calls.reset();
    qz.imprimirComandaOffline.and.resolveTo(true);
    const reintento = await servicio.imprimir('http://caja:17861', identidad, comandas, primero);
    expect(reintento.estado).toBe('confirmada');
    expect(qz.imprimirComandaOffline).toHaveBeenCalledOnceWith('<html>comanda</html>', 'BAR');
    expect(http.post).toHaveBeenCalledWith('http://caja:17861/api/impresiones/confirmar', {
      ...identidad, impresoras: ['COCINA', 'BAR'],
    });
  });

  it('permite reintentar el acuse sin volver a imprimir', async () => {
    http.post.and.callFake((url: string) => url.endsWith('/preparar') ? of('<html>comanda</html>') : throwError(() => new Error('sin red')));
    const primero = await servicio.imprimir('http://caja:17861', identidad, comandas);
    expect(primero.estado).toBe('confirmacion-pendiente');
    qz.imprimirComandaOffline.calls.reset();
    http.post.and.returnValue(of({ resultado: 'existente' }));
    expect(await servicio.confirmar('http://caja:17861', identidad, primero.impresorasAceptadas)).toBeTrue();
    expect(qz.imprimirComandaOffline).not.toHaveBeenCalled();
  });

  it('no acepta un progreso que omite o cambia las impresoras ya procesadas', async () => {
    await expectAsync(servicio.imprimir('http://caja:17861', identidad, comandas,
      { siguienteIndice: 1, impresorasAceptadas: ['OTRA'] })).toBeRejected();
    await expectAsync(servicio.imprimir('http://caja:17861', identidad, comandas,
      { siguienteIndice: 2, impresorasAceptadas: ['COCINA'] })).toBeRejected();
    expect(qz.imprimirComandaOffline).not.toHaveBeenCalled();
  });

  it('valida todas las comandas antes de imprimir la primera', async () => {
    await expectAsync(servicio.imprimir('http://caja:17861', identidad,
      [comandas[0], { impresora: ' ', datos: {} }])).toBeRejected();
    expect(qz.imprimirComandaOffline).not.toHaveBeenCalled();
  });

  it('rechaza direcciones de caja que contienen credenciales o rutas', async () => {
    await expectAsync(servicio.imprimir('http://usuario:clave@caja:17861', identidad, comandas)).toBeRejected();
    await expectAsync(servicio.imprimir('http://caja:17861/otra-ruta', identidad, comandas)).toBeRejected();
  });
});
