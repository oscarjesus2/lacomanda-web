import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { of, Subject } from 'rxjs';
import { CajaOfflineSesionService } from './caja-offline-sesion.service';
import { CajaOfflineComponent } from './caja-offline.component';
import { CajaOfflineApiService, CuentaLocal, MaestrosCaja, URL_CAJA_LOCAL, normalizarDireccionCaja } from './caja-offline-api.service';
import { prepararDocumentoPendiente } from './documento-caja-offline';
import { InstaladorCajaWindowsService } from './instalador-caja-windows.service';

const contexto = { idCaja: 2, idEstacion: 4, tenantId: 'demo', identificadorEstacion: 'estacion-caja', paisISO2: 'PE' };
const estado = { disponible: true, version: 7, contexto, mensaje: 'Preparada', capacidades: { pedidos: true, cobros: true, impresion: false } };
const maestros = { version: 7, mesas: [], productos: [], monedas: [{ IdMoneda: 'SOL', EsOficial: true }],
  documentos: [{ IdTipoDocumento: 2 }], tiposPago: [{ IdTipoPago: 1 }, { IdTipoPago: 3 }],
  cajas: [{ IdCaja: 2, CanalesVenta: [3] }], tarjetas: [{ IdTarjeta: 6 }], turnos: [{ IdCaja: 2, IdTurno: 1, Estado: 1 }],
  socios: [], clientes: [], descuentos: [], identidades: [], areas: [] } as MaestrosCaja;
const usuario = { IdUsuario: 8, NombreUsuario: 'Elena', IdEmpleado: 3, IdNivel: 2 } as any;
const cuenta = { identificador: 'ONLINE-12-1', version: 0, contenido: { Estado: 1, IdCaja: 2, IdPedido: 12, NroCuenta: 1,
  IdTurno: 1, Total: 20, ListaPedidoDet: [{ Estado: 1, Cantidad: 2, Subtotal: 20 }] } } as CuentaLocal;
const pago = { idDocumento: 2, correo: 'cliente@example.test', identificacion: '', razonSocial: '', direccion: '', tipoIdentidad: '', credito: false };
const efectivo = { IdTipoPago: 1, IdMoneda: 'SOL', MontoPagado: 10, MontoRecibido: 10, Vuelto: 2, Propina: 0, IdTarjeta: null, Autorizacion: '', TipoCambio: 1 };
const tarjeta = { ...efectivo, IdTipoPago: 3, MontoPagado: 12, MontoRecibido: 12, Vuelto: 0, Propina: 3, IdTarjeta: 6, Autorizacion: '42' };

describe('Caja sin conexión', () => {
  let api: jasmine.SpyObj<CajaOfflineApiService>;
  let componente: CajaOfflineSesionService;
  const instalador = jasmine.createSpyObj<InstaladorCajaWindowsService>('instalador', ['descargar']);
  const prefijo = 'offline.envio|' + URL_CAJA_LOCAL + '|demo|4|8|';
  const identidad = JSON.stringify([URL_CAJA_LOCAL, contexto.tenantId, contexto.idCaja, contexto.identificadorEstacion]);
  const claveDiario = 'offline.diarioPendiente|' + identidad;
  beforeEach(() => {
    sessionStorage.removeItem('offline.cajaPendienteDeRegreso');
    api = jasmine.createSpyObj('api', ['estado','usuarios','usuario','maestros','pedidos','operar','comprobarNube','gestionar','registrada']);
    api.comprobarNube.and.resolveTo(false);
    api.estado.and.resolveTo(estado);
    api.maestros.and.resolveTo(maestros);
    api.pedidos.and.resolveTo([cuenta]);
    api.usuarios.and.resolveTo([usuario]);
    api.usuario.and.resolveTo(usuario);
    componente = new CajaOfflineSesionService(api, { getCurrentSession: () => null } as any, {} as any, {} as any, instalador);
    componente.base = URL_CAJA_LOCAL;
    componente.estado = estado;
    componente.maestros = maestros;
    componente.idUsuario = usuario.IdUsuario;
  });
  afterEach(() => {
    componente.salir();
    sessionStorage.removeItem('offline.cajaPendienteDeRegreso');
    localStorage.removeItem(claveDiario);
    componente.ngOnDestroy();
    for (const key of Object.keys(localStorage)) if (key.startsWith(prefijo)) localStorage.removeItem(key);
  });
  it('consulta el estado directamente en la red local aunque la PWA esté instalada', async () => {
    const backend = { handle: (peticion: HttpRequest<unknown>) => {
      expect(peticion.url).toBe(URL_CAJA_LOCAL + '/api/estado');
      expect(peticion.params.get('ngsw-bypass')).toBe('true');
      return of(new HttpResponse({ body: estado }));
    } };
    expect(await new CajaOfflineApiService(backend).estado(URL_CAJA_LOCAL)).toEqual(estado);
  });
  it('detecta una respuesta de otro servicio en el puerto configurado', async () => {
    const backend = { handle: () => of(new HttpResponse({ body: { status: 'ok' } })) };
    await expectAsync(new CajaOfflineApiService(backend).estado(URL_CAJA_LOCAL))
      .toBeRejectedWithError(/dirección y el puerto/);
  });
  for (const status of [0, 504]) {
    it('identifica una caja inaccesible al comprobar la conexión con HTTP ' + status, async () => {
      api.estado.and.rejectWith(new HttpErrorResponse({ status }));
      componente.direccion = URL_CAJA_LOCAL;
      await componente.conectar();
      expect(componente.error).toContain(URL_CAJA_LOCAL);
      expect(componente.error).toContain('servicio de caja esté iniciado');
      expect(api.usuarios).not.toHaveBeenCalled();
    });
  }
  it('conserva el motivo comunicado por el servicio de caja', async () => {
    api.estado.and.rejectWith(new HttpErrorResponse({ status: 500, error: { mensaje: 'No se pudo leer la información local.' } }));
    componente.direccion = URL_CAJA_LOCAL;
    await componente.conectar();
    expect(componente.error).toBe('No se pudo leer la información local.');
  });
  it('ofrece preparación al faltar la caja local y conserva el estado de la nube', async () => {
    componente.direccion = URL_CAJA_LOCAL;
    api.comprobarNube.and.resolveTo(true);
    api.estado.and.rejectWith(new HttpErrorResponse({ status: 0 }));
    await componente.conectar();
    expect(componente.servicioInaccesible).toBeTrue();
    expect(componente.nube).toBeTrue();
    componente.direccion = 'https://otra-caja.test';
    await componente.conectar();
    expect(componente.servicioInaccesible).toBeFalse();
  });
  it('espera la primera copia solo después de descargar el instalador de la estación verificada', async () => {
    const sincronizacion = jasmine.createSpyObj('sincronizacion', ['esperarInstalacion']);
    const pagina = new CajaOfflineSesionService(api, {} as any, {} as any, sincronizacion, instalador);
    pagina.base = URL_CAJA_LOCAL;
    pagina.nube = false;
    await pagina.descargarInstalador();
    expect(instalador.descargar).not.toHaveBeenCalled();
    expect(sincronizacion.esperarInstalacion).not.toHaveBeenCalled();
    pagina.nube = true;
    instalador.descargar.and.resolveTo({ tenantId: 'demo', identificadorEstacion: 'caja' });
    await pagina.descargarInstalador();
    expect(sincronizacion.esperarInstalacion).toHaveBeenCalledWith('demo', 'caja');
    expect(pagina.mensaje).toContain('.cmd');
  });
  it('calcula efectivo, cambio, tarjeta y propina sin duplicarlos', () => {
    const documento = prepararDocumentoPendiente(pago, cuenta.contenido, usuario, contexto, maestros, [efectivo, tarjeta]);
    expect(documento.listaPago.map(p => [p.IdTipoPago,p.MontoPagado,p.Propina,p.Vuelto])).toEqual([[1,10,0,2],[3,12,3,0]]);
    expect(documento.venta.Total).toBe(20);
    expect(documento.venta.Propina).toBe(3);
  });
  it('ofrece la actualización de la caja vinculada anterior sin interrumpir ventas ni sincronizar al descargar', async () => {
    const { tenantId, identificadorEstacion } = contexto;
    const instaladorCaja = jasmine.createSpyObj('instalador', ['descargar'], { esWindows: true, identidad: { tenantId, identificadorEstacion } });
    instaladorCaja.descargar.and.resolveTo({ tenantId, identificadorEstacion });
    const sincronizacion = { esperarInstalacion: jasmine.createSpy('esperarInstalacion') };
    const local = new CajaOfflineSesionService(api, { getCurrentSession: () => null } as any, {} as any, sincronizacion as any, instaladorCaja);
    local.base = URL_CAJA_LOCAL;
    local.nube = true;
    local.estado = estado;
    expect(local.puedeActualizarServicio).toBeTrue();
    await local.descargarActualizacionServicio();
    expect(instaladorCaja.descargar).toHaveBeenCalledTimes(1);
    expect(local.mensaje).toContain('inicies sesión en Windows');
    expect(sincronizacion.esperarInstalacion).not.toHaveBeenCalled();
    expect(api.gestionar).not.toHaveBeenCalled();
    for (const regularizacionPendiente of [false, true]) {
      local.estado = { ...estado, regularizacionPendiente };
      expect(local.puedeActualizarServicio).toBeTrue();
      local.estado = { ...estado, regularizacionPendiente, versionProtocolo: 2 };
      expect(local.puedeActualizarServicio).toBeFalse();
    }
    local.estado = { ...estado, identidad: { tenantId, identificadorEstacion: 'otra-estacion' } };
    expect(local.puedeActualizarServicio).toBeFalse();
    local.estado = estado;
    local.nube = false;
    expect(local.puedeActualizarServicio).toBeFalse();
    local.nube = true;
    local.base = 'https://caja.test';
    expect(local.puedeActualizarServicio).toBeFalse();
  });
  it('rechaza el abono insuficiente antes de enviar un cobro', () => {
    expect(() => prepararDocumentoPendiente(pago, cuenta.contenido, usuario, contexto, maestros, [efectivo])).toThrow();
  });
  it('exige identificación para importes por encima del límite de la boleta', () => {
    expect(() => prepararDocumentoPendiente(pago, { ...cuenta.contenido, Total: 800 }, usuario, contexto, maestros, [{ ...efectivo, MontoPagado: 800, Vuelto: 0 }])).toThrow();
  });
  it('recupera la misma solicitud de cobro tras perder el acuse y reabrir la pantalla', async () => {
    await componente.entrar();
    const datos = { referenciaPedido: cuenta.identificador, versionPedido: cuenta.version,
      correoComprobante: pago.correo, documento: prepararDocumentoPendiente(pago, cuenta.contenido, usuario, contexto, maestros, [efectivo, tarjeta]) };
    api.operar.and.rejectWith(new HttpErrorResponse({status: 0}));
    await expectAsync(componente.registrarOperacion('cobros', datos)).toBeRejected();
    const original = api.operar.calls.first().args[1];
    expect(original.datos['versionMaestros']).toBe(7);
    expect(original.datos['versionPedido']).toBe(0);
    expect(JSON.parse(localStorage.getItem(prefijo + original.datos.idOperacion))).toEqual({ id: original.datos.idOperacion, ruta: 'cobros', referenciaPedido: cuenta.identificador });
    const reabierta = new CajaOfflineSesionService(api, {} as any, {} as any, {} as any, instalador);
    reabierta.base = URL_CAJA_LOCAL;
    reabierta.idUsuario = usuario.IdUsuario;
    await reabierta.entrar();
    api.registrada.and.resolveTo(true);
    await reabierta.comprobarEnvio(reabierta.pendientes[0]);
    reabierta.ngOnDestroy();
    expect(api.operar).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(prefijo + original.datos.idOperacion)).toBeNull();
  });
  it('permite revisar la impresión interrumpida en caja al reabrir con la nube disponible', async () => {
    const impresion = jasmine.createSpyObj('impresion', ['listarPendientes', 'reanudar']);
    const plan = { idOperacion: 'impresion', trabajos: [{ impresora: 'Cocina' }] };
    const trabajo = { plan, estados: [{ estado: 'enviando', idIntento: 'intento' }] };
    impresion.listarPendientes.and.resolveTo([trabajo]);
    api.comprobarNube.and.resolveTo(true);
    api.estado.and.resolveTo({ ...estado, capacidades: { ...estado.capacidades, impresion: true } });
    const pagina = new CajaOfflineSesionService(api, {} as any, impresion, {} as any, instalador);
    pagina.base = URL_CAJA_LOCAL;
    pagina.idUsuario = usuario.IdUsuario;
    await pagina.entrar();
    pagina.ngOnDestroy();
    expect(pagina.nube).toBeTrue();
    expect(pagina.impresiones[0] as any).toEqual(trabajo);
    expect(impresion.reanudar).not.toHaveBeenCalled();
  });
  it('impide un cobro nuevo cuando la nube vuelve a responder', async () => {
    await componente.entrar();
    const datos = { referenciaPedido: cuenta.identificador, versionPedido: cuenta.version,
      correoComprobante: pago.correo, documento: prepararDocumentoPendiente(pago, cuenta.contenido, usuario, contexto, maestros, [efectivo, tarjeta]) };
    api.comprobarNube.and.resolveTo(true);
    await expectAsync(componente.registrarOperacion('cobros', datos)).toBeRejected();
    expect(api.operar).not.toHaveBeenCalled();
    expect(componente.nube).toBeTrue();
  });
  it('actualiza la franja al recuperar la red sin salir del TPV y deja de escuchar al cambiar de operador', async () => {
    await componente.entrar();
    expect(componente.activa).toBeTrue();
    expect(componente.nube).toBeFalse();
    api.comprobarNube.and.resolveTo(true);
    window.dispatchEvent(new Event('online'));
    await new Promise<void>(resolver => setTimeout(resolver));
    expect(componente.nube).toBeTrue();
    expect(componente.usuario).toBe(usuario);
    expect(componente.activa).toBeTrue();
    api.comprobarNube.and.resolveTo(false);
    window.dispatchEvent(new Event('offline'));
    await new Promise<void>(resolver => setTimeout(resolver));
    expect(componente.nube).toBeFalse();
    componente.salir();
    const llamadas = api.comprobarNube.calls.count();
    window.dispatchEvent(new Event('online'));
    await new Promise<void>(resolver => setTimeout(resolver));
    expect(api.comprobarNube.calls.count()).toBe(llamadas);
  });
  it('detecta un reemplazo de instantánea durante la lectura de cuentas y maestros', async () => {
    api.estado.and.returnValues(Promise.resolve(estado), Promise.resolve({ ...estado, version: 8 }));
    await expectAsync(componente.actualizar()).toBeRejected();
  });
  for (const [nivel, ruta] of [[2, '/caja'], [3, '/mozo']] as const) {
    it('abre la pantalla habitual de ' + ruta + ' al verificar al operador local', async () => {
      api.usuario.and.resolveTo({ ...usuario, IdNivel: nivel });
      const router = jasmine.createSpyObj('router', ['navigateByUrl']);
      const pagina = new CajaOfflineComponent(componente, router, {} as any, {} as any);
      await pagina.entrar();
      expect(router.navigateByUrl).toHaveBeenCalledOnceWith(ruta);
      pagina.ngOnDestroy();
      expect(componente.permiteRuta(ruta)).toBeTrue();
      expect(componente.permiteRuta('/admin')).toBeFalse();
      const recargada = new CajaOfflineSesionService(api, {} as any, {} as any, {} as any, instalador);
      expect(recargada.requiereSeleccion).toBeTrue();
      expect(recargada.permiteRuta(ruta)).toBeFalse();
    });
  }
  it('con la nube disponible abre la revisión y mantiene las ventas en el servicio online', async () => {
    api.comprobarNube.and.resolveTo(true);
    const router = jasmine.createSpyObj('router', ['navigateByUrl']);
    await new CajaOfflineComponent(componente, router, {} as any, {} as any).entrar();
    expect(componente.usuario).toBe(usuario);
    expect(componente.activa).toBeFalse();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
  it('abre la caja con el cajero de la sesión online aunque la revisión local corresponda a un mozo', async () => {
    api.comprobarNube.and.resolveTo(true);
    const token = 'x.' + btoa(JSON.stringify({ exp: 4e9 })) + '.x';
    const sesion = { Token: token, TenantID: contexto.tenantId, Ip: contexto.identificadorEstacion, User: { ...usuario, TipoCompu: 2 } };
    const local = new CajaOfflineSesionService(api, { getCurrentSession: () => sesion } as any, {} as any, {} as any, instalador);
    local.estado = estado;
    local.base = URL_CAJA_LOCAL;
    local.usuario = { ...usuario, IdNivel: 3 };
    const router = jasmine.createSpyObj('router', ['navigateByUrl', 'navigate']);
    await new CajaOfflineComponent(local, router, {} as any, {} as any).abrirVentasOnline();
    expect(local.usuario).toBeUndefined();
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/caja');
    expect(router.navigate).not.toHaveBeenCalled();
  });
  it('abre el inicio de sesión con retorno al puesto de mozo cuando falta la sesión online', async () => {
    api.comprobarNube.and.resolveTo(true);
    componente.usuario = { ...usuario, IdNivel: 3 };
    const router = jasmine.createSpyObj('router', ['navigateByUrl', 'navigate']);
    await new CajaOfflineComponent(componente, router, {} as any, {} as any).abrirVentasOnline();
    expect(router.navigate).toHaveBeenCalledOnceWith(['/iniciar-sesion'], { queryParams: { returnUrl: '/mozo' } });
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
  describe('regreso al TPV online tras un corte', () => {
    const token = 'x.' + btoa(JSON.stringify({ exp: 4e9 })) + '.x';
    const sesion = { Token: token, TenantID: contexto.tenantId, Ip: contexto.identificadorEstacion, User: { ...usuario, TipoCompu: 2 } };
    let local: CajaOfflineSesionService;
    let router: jasmine.SpyObj<any>;
    let pagina: CajaOfflineComponent;
    beforeEach(async () => {
      local = new CajaOfflineSesionService(api, { getCurrentSession: () => sesion } as any, {} as any, {} as any, instalador);
      local.base = URL_CAJA_LOCAL;
      local.estado = estado;
      local.idUsuario = usuario.IdUsuario;
      await local.entrar();
      api.comprobarNube.and.resolveTo(true);
      router = jasmine.createSpyObj('router', ['navigate', 'navigateByUrl']);
      pagina = new CajaOfflineComponent(local, router, { instalacionPreparada$: new Subject<void>() } as any,
        { snapshot: { queryParamMap: { get: () => '1' } } } as any);
    });
    afterEach(() => {
      local.ngOnDestroy();
      pagina.ngOnDestroy();
    });
    it('abre la ruta solicitada sin consultar la caja local en un login sin contingencia', async () => {
      local.salir();
      sessionStorage.removeItem('offline.cajaPendienteDeRegreso');
      sessionStorage.setItem('offline.seleccionOperador', '1');
      api.estado.calls.reset();
      api.comprobarNube.calls.reset();
      api.estado.and.rejectWith(new Error('servicio local detenido'));
      expect(await local.destinoTrasLogin('/caja')).toBe('/caja');
      expect(api.estado).not.toHaveBeenCalled();
      expect(api.comprobarNube).not.toHaveBeenCalled();
      expect(local.requiereSeleccion).toBeFalse();
    });
    it('libera el selector antiguo cuando la misma caja confirma que ya no hay operaciones', async () => {
      local.salir();
      sessionStorage.setItem('offline.seleccionOperador', '1');
      api.estado.and.resolveTo({ ...estado, regularizacionPendiente: false });
      expect(await local.destinoTrasLogin('/caja')).toBe('/caja');
      expect(local.requiereSeleccion).toBeFalse();
      expect(sessionStorage.getItem('offline.cajaPendienteDeRegreso')).toBeNull();
      expect(api.gestionar).not.toHaveBeenCalled();
    });
    it('recupera el diario después de cerrar la PWA y lo conserva hasta confirmar el mismo origen y estación', async () => {
      api.comprobarNube.and.resolveTo(false);
      api.operar.and.resolveTo({ resultado: 'guardado' });
      await local.registrarOperacion('pedidos', {});
      expect(localStorage.getItem(claveDiario)).toBeTruthy();
      local.salir();
      sessionStorage.removeItem('offline.cajaPendienteDeRegreso');
      api.estado.and.resolveTo({ ...estado, regularizacionPendiente: true });
      expect(await local.destinoTrasLogin('/caja')).toBe('/offline?regularizar=1');
      api.estado.and.rejectWith(new Error('sin respuesta'));
      expect(await local.destinoTrasLogin('/caja')).toBe('/offline?regularizar=1');
      api.estado.and.resolveTo({ ...estado, contexto: { ...contexto, idCaja: 9 }, regularizacionPendiente: false });
      expect(await local.destinoTrasLogin('/caja')).toBe('/offline?regularizar=1');
      expect(localStorage.getItem(claveDiario)).toBeTruthy();
      api.estado.and.resolveTo({ ...estado, regularizacionPendiente: false });
      expect(await local.destinoTrasLogin('/caja')).toBe('/caja');
      expect(localStorage.getItem(claveDiario)).toBeNull();
    });
    it('comprueba el envío sin acuse de una versión anterior y relee el diario tras encontrarlo', async () => {
      local.salir();
      sessionStorage.removeItem('offline.cajaPendienteDeRegreso');
      localStorage.setItem(prefijo + 'anterior', JSON.stringify({ id: 'anterior', ruta: 'cobros' }));
      api.estado.and.resolveTo({ ...estado, regularizacionPendiente: false });
      api.registrada.and.resolveTo(false);
      expect(await local.destinoTrasLogin('/caja')).toBe('/offline?regularizar=1');
      expect(localStorage.getItem(prefijo + 'anterior')).toBeTruthy();
      api.registrada.and.resolveTo(true);
      api.estado.and.returnValues(Promise.resolve({ ...estado, regularizacionPendiente: false }),
        Promise.resolve({ ...estado, regularizacionPendiente: true }));
      expect(await local.destinoTrasLogin('/caja')).toBe('/offline?regularizar=1');
      expect(api.registrada).toHaveBeenCalledWith(URL_CAJA_LOCAL, 'anterior', usuario.IdUsuario);
      expect(localStorage.getItem(prefijo + 'anterior')).toBeNull();
      expect(localStorage.getItem(claveDiario)).toBeTruthy();
    });
    it('permite cerrar un envío no registrado después de revisar la cuenta y verificar de nuevo su referencia', async () => {
      const intento = { id: 'revisado', ruta: 'pedidos' as const, sinRegistro: false };
      localStorage.setItem(prefijo + intento.id, JSON.stringify(intento));
      local.pendientes = [intento];
      api.registrada.and.resolveTo(false);
      await local.cerrarEnvioRevisado(intento);
      expect(localStorage.getItem(prefijo + intento.id)).toBeTruthy();
      await local.comprobarEnvio(intento);
      expect(intento.sinRegistro).toBeTrue();
      await local.cerrarEnvioRevisado(intento);
      expect(api.registrada).toHaveBeenCalledTimes(2);
      expect(localStorage.getItem(prefijo + intento.id)).toBeNull();
    });
    it('abre las ventas después de confirmar el lote anterior y las operaciones posteriores', async () => {
      api.gestionar.and.returnValues(Promise.resolve({ enviado: true, id: 'lote-1', operaciones: 2 }),
        Promise.resolve({ enviado: true, id: 'lote-2', operaciones: 1 }), Promise.resolve({ enviado: false }));
      await pagina.abrirVentasOnline();
      expect(api.gestionar).toHaveBeenCalledTimes(3);
      expect(api.gestionar).toHaveBeenCalledWith(URL_CAJA_LOCAL, 'regularizar', token);
      expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/caja');
      expect(local.activa).toBeFalse();
    });
    it('conserva la sesión local y muestra el motivo si la nube rechaza el lote', async () => {
      api.gestionar.and.rejectWith(new HttpErrorResponse({ status: 409, error: { mensaje: 'La cuenta tiene un conflicto.' } }));
      await pagina.abrirVentasOnline();
      expect(local.activa).toBeTrue();
      expect(local.usuario).toBe(usuario);
      expect(local.error).toContain('conflicto');
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });
    it('exige autenticación con retorno a la regularización cuando el token ha vencido', async () => {
      const sinToken = new CajaOfflineComponent(componente, router, {} as any, {} as any);
      await sinToken.abrirVentasOnline();
      expect(router.navigate).toHaveBeenCalledOnceWith(['/iniciar-sesion'], { queryParams: { returnUrl: '/offline?regularizar=1' } });
      expect(api.gestionar).not.toHaveBeenCalled();
    });
    it('retoma la regularización tras login y no abre el TPV con un acuse incompleto', async () => {
      local.salir();
      api.gestionar.and.resolveTo({ enviado: true });
      await pagina.ngOnInit();
      expect(local.error).toContain('no confirmó');
      expect(router.navigateByUrl).not.toHaveBeenCalled();
      api.gestionar.and.resolveTo({ enviado: false });
      await pagina.abrirVentasOnline();
      expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/caja');
    });
    it('una estación en la LAN espera la confirmación de la caja principal', async () => {
      local.salir();
      local.base = 'https://caja.lan';
      local.idUsuario = usuario.IdUsuario;
      api.comprobarNube.and.resolveTo(false);
      await local.entrar();
      api.comprobarNube.and.resolveTo(true);
      api.estado.and.resolveTo({ ...estado, regularizacionPendiente: true });
      await expectAsync(local.prepararRegresoOnline()).toBeRejectedWithError(/caja principal/);
      expect(local.activa).toBeTrue();
      api.estado.and.resolveTo({ ...estado, regularizacionPendiente: false });
      expect((await local.prepararRegresoOnline()).requiereLogin).toBeFalse();
      expect(api.gestionar).not.toHaveBeenCalled();
    });
  });
  it('recupera el mismo operador solo cuando coinciden sucursal, estación y rol', async () => {
    const token = 'x.' + btoa(JSON.stringify({ exp: 4e9 })) + '.x';
    const sesion = { Token: token, User: usuario, TenantID: 'otra', Ip: contexto.identificadorEstacion };
    const local = new CajaOfflineSesionService(api, { getCurrentSession: () => sesion } as any, {} as any, {} as any, instalador);
    local.base = URL_CAJA_LOCAL;
    await local.entrar(true);
    expect(local.usuario).toBeUndefined();
    sesion.TenantID = contexto.tenantId;
    sesion.Ip = 'otra-estacion';
    await local.entrar(true);
    expect(local.usuario).toBeUndefined();
    sesion.Ip = contexto.identificadorEstacion;
    api.usuario.and.resolveTo({ ...usuario, IdNivel: 3 });
    await local.entrar(true);
    expect(local.usuario).toBeUndefined();
    api.usuario.and.resolveTo(usuario);
    await local.entrar(true);
    expect(local.permiteRuta('/caja')).toBeTrue();
    local.salir();
    local.ngOnDestroy();
  });
  it('volver a la gestión mantiene la sesión sin redirigir a ventas', async () => {
    await componente.entrar();
    const router = jasmine.createSpyObj('router', ['navigateByUrl']);
    const pagina = new CajaOfflineComponent(componente, router, { instalacionPreparada$: new Subject<void>() } as any, {} as any);
    spyOn(componente, 'refrescar').and.resolveTo();
    pagina.ngOnInit();
    expect(componente.refrescar).toHaveBeenCalled();
    expect(componente.usuario).toBe(usuario);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    pagina.ngOnDestroy();
    expect(componente.activa).toBeTrue();
  });
  it('conserva el acuse de guardado si falla la lectura posterior', async () => {
    await componente.entrar();
    const respuesta = { resultado: 'ok', referenciaPedido: cuenta.identificador };
    api.operar.and.resolveTo(respuesta);
    api.pedidos.and.rejectWith(new Error('Se interrumpió la conexión local'));
    expect(await componente.registrarOperacion('pedidos', {})).toBe(respuesta);
    expect(componente.pendientes).toEqual([]);
    expect(componente.error).toContain('guardada');
  });
  it('comprueba un envío ambiguo sin repetir la escritura cuando regresa internet', async () => {
    await componente.entrar();
    api.operar.and.rejectWith(new HttpErrorResponse({ status: 0 }));
    await expectAsync(componente.registrarOperacion('pedidos', {})).toBeRejected();
    api.registrada.and.resolveTo(false);
    api.comprobarNube.and.resolveTo(true);
    const pendiente = componente.pendientes[0];
    await componente.comprobarEnvio(pendiente);
    expect(api.operar).toHaveBeenCalledTimes(1);
    expect(componente.pendientes).toEqual([pendiente]);
    expect(componente.mensaje).toContain('aún no ha confirmado');
  });
  it('detecta otra estación aunque coincida la versión de la copia antes de guardar', async () => {
    await componente.entrar();
    api.estado.and.resolveTo({ ...estado, contexto: { ...contexto, tenantId: 'otra' } });
    await expectAsync(componente.registrarOperacion('pedidos', {})).toBeRejected();
    expect(api.operar).not.toHaveBeenCalled();
    expect(componente.pendientes).toEqual([]);
  });
  it('acepta solo orígenes completos de caja sin credenciales ni rutas', () => {
    expect(normalizarDireccionCaja('https://caja.local:17862/')).toBe('https://caja.local:17862');
    expect(() => normalizarDireccionCaja('https://token@caja.local/')).toThrow();
    expect(() => normalizarDireccionCaja('https://caja.local/otra')).toThrow();
  });
});

