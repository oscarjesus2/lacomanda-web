import { of, throwError } from 'rxjs';
import { OfflineImpresionPersistenteService } from './offline-impresion-persistente.service';
import { IdentidadImpresionLocal } from './offline-impresion.service';

describe('OfflineImpresionPersistenteService', () => {
  let servicio: OfflineImpresionPersistenteService;
  let http: jasmine.SpyObj<{ post: (url: string, body: any) => any }>;
  let qz: jasmine.SpyObj<{ imprimirComandaOffline: (html: string, impresora: string) => Promise<boolean> }>;
  const identidad: IdentidadImpresionLocal = {
    idOperacion: 'confirmacion', idOperacionPedido: 'pedido', idEstacion: 5, idUsuario: 8, numeroOffline: 'OFF-1',
  };
  const comandas = [{ impresora: 'Cocina', datos: { area: 'COCINA', fechaUtc: '2026-11-24T14:00:00.000Z' } },
    { impresora: 'Bar', datos: { area: 'BAR', fechaUtc: '2026-11-24T14:00:00.000Z' } }];

  beforeEach(() => {
    http = jasmine.createSpyObj('http', ['post']);
    qz = jasmine.createSpyObj('qz', ['imprimirComandaOffline']);
    qz.imprimirComandaOffline.and.resolveTo(true);
    servicio = Object.create(OfflineImpresionPersistenteService.prototype) as OfflineImpresionPersistenteService;
    (servicio as any).localHttp = http;
    (servicio as any).qz = qz;
  });

  it('reanuda solo los trabajos pendientes y confirma cuando todos fueron aceptados', async () => {
    http.post.and.callFake((url, body) => {
      if (url.endsWith('/confirmar')) return of({ resultado: 'registrada' });
      if (url.endsWith('/preparar')) return of('<html>comanda</html>');
      if (body.accion === 'crear') return of({ estados: [{ estado: 'aceptada', idIntento: 'anterior' },
        { estado: 'pendiente', idIntento: null }] });
      return of({ estados: [] });
    });
    const resultado = await servicio.continuar('http://caja:17861', identidad, comandas);
    expect(resultado.estado).toBe('confirmada');
    expect(qz.imprimirComandaOffline).toHaveBeenCalledOnceWith('<html>comanda</html>', 'Bar');
    expect(http.post.calls.allArgs().some(args => args[1].accion === 'iniciar' && args[1].indice === 1)).toBeTrue();
  });

  it('pide revisar un envío interrumpido sin reimprimir', async () => {
    http.post.and.returnValue(of({ estados: [{ estado: 'aceptada', idIntento: 'anterior' },
      { estado: 'enviando', idIntento: 'intento' }] }));
    const resultado = await servicio.continuar('http://caja:17861', identidad, comandas);
    expect(resultado).toEqual({ estado: 'revision-pendiente', indice: 1, idIntento: 'intento' });
    expect(qz.imprimirComandaOffline).not.toHaveBeenCalled();
  });

  it('recupera de caja el plan original después de cerrar el navegador', async () => {
    http.post.and.callFake((url, body) => {
      if (body.accion === 'consultar') return of({ plan: { ...identidad, trabajos: comandas }, estados: [] });
      if (url.endsWith('/confirmar')) return of({ resultado: 'existente' });
      return of({ estados: [{ estado: 'aceptada', idIntento: 'uno' }, { estado: 'aceptada', idIntento: 'dos' }] });
    });
    expect((await servicio.reanudar('http://caja:17861', identidad)).estado).toBe('confirmada');
    expect(qz.imprimirComandaOffline).not.toHaveBeenCalled();
  });

  it('consulta a caja los planes pendientes de la estación y el usuario', async () => {
    http.post.and.returnValue(of([]));
    expect(await servicio.listarPendientes('http://caja:17861', 5, 8)).toEqual([]);
    expect(http.post).toHaveBeenCalledWith('http://caja:17861/api/impresiones/pendientes', { idEstacion: 5, idUsuario: 8 });
  });

  it('no imprime si caja no puede guardar el inicio del envío', async () => {
    http.post.and.callFake((_url, body) => body.accion === 'crear'
      ? of({ estados: [{ estado: 'pendiente', idIntento: null }, { estado: 'pendiente', idIntento: null }] })
      : throwError(() => new Error('sin conexión')));
    const resultado = await servicio.continuar('http://caja:17861', identidad, comandas);
    expect(resultado.estado).toBe('revision-pendiente');
    expect(qz.imprimirComandaOffline).not.toHaveBeenCalled();
  });

  it('reintenta solo la confirmación cuando las comandas ya constan aceptadas', async () => {
    http.post.and.callFake((url) => url.endsWith('/confirmar') ? of({ resultado: 'existente' })
      : of({ estados: [{ estado: 'aceptada', idIntento: 'uno' }, { estado: 'aceptada', idIntento: 'dos' }] }));
    expect((await servicio.continuar('http://caja:17861', identidad, comandas)).estado).toBe('confirmada');
    expect(qz.imprimirComandaOffline).not.toHaveBeenCalled();
  });

  it('envía a caja la decisión de la persona que revisó la impresión', async () => {
    http.post.and.returnValue(of({ estados: [] }));
    await servicio.resolver('http://caja:17861', identidad, 1, 'intento', 'reimprimir');
    expect(http.post).toHaveBeenCalledWith('http://caja:17861/api/impresiones/progreso', {
      accion: 'resolver', ...identidad, indice: 1, idIntento: 'intento', decision: 'reimprimir',
    });
  });
});
