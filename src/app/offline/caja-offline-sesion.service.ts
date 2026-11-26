import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CanalVentaEnum, EstacionTipoEnum, NivelUsuarioEnum } from '../enums/enum';
import { Usuario } from '../models/usuario.models';
import { isJwtActive } from '../services/auth/token.utils';
import { StorageService } from '../services/storage.service';
import { InstaladorCajaWindowsService, nombreInstalador } from './instalador-caja-windows.service';
import { CajaOfflineApiService, ContextoCaja, CuentaLocal, EstadoCaja, MaestrosCaja, OperacionCaja,
  ProductoCaja, RespuestaOperacion, RutaOperacion, URL_CAJA_LOCAL, normalizarDireccionCaja } from './caja-offline-api.service';
import { CajaOfflineSincronizacionService } from './caja-offline-sincronizacion.service';
import { IdentidadImpresionLocal } from './offline-impresion.service';
import { RUTA_REGULARIZAR_CAJA } from './ruta-regularizacion';
import { observarConexionNube } from './offline-disponibilidad.service';
import { OfflineImpresionPersistenteService, ProgresoComandasLocal } from './offline-impresion-persistente.service';

const CLAVE_SESION_LOCAL = 'offline.seleccionOperador';
const CLAVE_CONTINGENCIA = 'offline.cajaPendienteDeRegreso';
const PREFIJO_DIARIO = 'offline.diarioPendiente|';

interface DestinoVentasOnline { ruta: '/caja' | '/mozo'; requiereLogin: boolean; returnUrl: string }

interface EnvioPendiente { id: string; ruta: RutaOperacion; accion?: string; referenciaPedido?: string; reintroducir?: boolean; sinRegistro?: boolean }
const NOMBRES_CANALES = [
  { id: CanalVentaEnum.ESPACIO, nombre: 'Mesa' }, { id: CanalVentaEnum.PARA_LLEVAR, nombre: 'Para llevar' },
  { id: CanalVentaEnum.DELIVERY, nombre: 'Delivery' },
];

@Injectable({ providedIn: 'root' })
export class CajaOfflineSesionService implements OnDestroy {
  direccion = localStorage.getItem('offline.direccionCaja') || URL_CAJA_LOCAL;
  base = '';
  estado?: EstadoCaja;
  nube?: boolean;
  usuarios: Usuario[] = [];
  usuario?: Usuario;
  idUsuario?: number;
  maestros?: MaestrosCaja;
  cuentas: CuentaLocal[] = [];
  pendientes: EnvioPendiente[] = [];
  private readonly datosEnMemoria = new Map<string, OperacionCaja>();
  impresiones: ProgresoComandasLocal[] = [];
  ocupado = false;
  mensaje = '';
  error = '';
  servicioInaccesible = false;
  private enVenta = false;
  private generacion = 0;
  private sondeo?: ReturnType<typeof setInterval>;
  private conexionNube?: Subscription;
  private imprimiendo = false;
  private readonly impresionesIntentadas = new Set<string>();
  private destruido = false;

  constructor(private readonly api: CajaOfflineApiService, private readonly storage: StorageService,
    private readonly impresion: OfflineImpresionPersistenteService,
    private readonly sincronizacion: CajaOfflineSincronizacionService,
    readonly instalador: InstaladorCajaWindowsService) {}

  ngOnDestroy(): void {
    this.destruido = true;
    this.generacion++;
    this.conexionNube?.unsubscribe();
    clearInterval(this.sondeo);
  }

  get activa(): boolean { return this.enVenta && !!this.usuario; }
  get requiereSeleccion(): boolean { return !this.usuario && sessionStorage.getItem(CLAVE_SESION_LOCAL) === '1'; }
  get rutaVenta(): '/mozo' | '/caja' { return this.usuario?.IdNivel === NivelUsuarioEnum.Mozo ? '/mozo' : '/caja'; }
  permiteRuta(url: string): boolean {
    return this.activa && url.split(/[?#]/, 1)[0] === this.rutaVenta;
  }

  async destinoTrasLogin(ruta: string): Promise<string> {
    const sesion = this.storage.getCurrentSession();
    const tenant = sesion?.TenantID?.trim().toLowerCase();
    let identidad = sessionStorage.getItem(CLAVE_CONTINGENCIA);
    try {
      if (identidad && JSON.parse(identidad)[1] !== tenant) {
        // La otra sucursal conserva su propio diario aunque se cambie de sesión.
        if (!localStorage.getItem(PREFIJO_DIARIO + identidad)) localStorage.setItem(PREFIJO_DIARIO + identidad, 'anterior');
        sessionStorage.removeItem(CLAVE_CONTINGENCIA);
        this.salir();
        identidad = null;
      }
      if (!identidad) {
        identidad = Object.keys(localStorage).filter(clave => clave.startsWith(PREFIJO_DIARIO))
          .map(clave => clave.slice(PREFIJO_DIARIO.length)).find(marca => JSON.parse(marca)[1] === tenant);
      }
      const envio = this.referenciasSinAcuse(tenant)[0];
      if (!identidad && !envio) {
        if (sessionStorage.getItem(CLAVE_SESION_LOCAL)) this.salir();
        return ruta;
      }

      const base = normalizarDireccionCaja(identidad ? JSON.parse(identidad)[0] : envio.base);
      this.direccion = base;
      if (!identidad) {
        const { contexto } = await this.api.estado(base);
        if (!contexto || contexto.tenantId.toLowerCase() !== tenant || contexto.idEstacion !== envio.estacion
            || (base === URL_CAJA_LOCAL && contexto.identificadorEstacion !== sesion.Ip)) return RUTA_REGULARIZAR_CAJA;
        identidad = this.identidadRegreso(contexto, base);
        localStorage.setItem(PREFIJO_DIARIO + identidad, envio.id);
      }
      // Una reapertura de la PWA puede haber perdido sessionStorage.
      sessionStorage.setItem(CLAVE_CONTINGENCIA, identidad);
      const revision = localStorage.getItem(PREFIJO_DIARIO + identidad);
      const estado = await this.estadoParaRegreso(base, identidad);
      if (sesion !== this.storage.getCurrentSession() || !estado.disponible || !estado.contexto
          || estado.contexto.tenantId.toLowerCase() !== tenant
          || (base === URL_CAJA_LOCAL && estado.contexto.identificadorEstacion !== sesion.Ip)
          || identidad !== this.identidadRegreso(estado.contexto, base)
          || estado.regularizacionPendiente !== false) return RUTA_REGULARIZAR_CAJA;
      if (!this.cerrarDiario(identidad, revision)) return RUTA_REGULARIZAR_CAJA;
      this.salir();
      sessionStorage.removeItem(CLAVE_CONTINGENCIA);
      if (ruta === RUTA_REGULARIZAR_CAJA) return this.destinoVentasOnline().ruta;
      return ruta;
    } catch {
      return RUTA_REGULARIZAR_CAJA;
    }
  }

  destinoVentasOnline(): { ruta: '/caja' | '/mozo'; requiereLogin: boolean } {
    const sesion = this.storage.getCurrentSession();
    const usuario = sesion?.User;
    const tipo = usuario?.TipoCompu;
    const estacionVentas = tipo === EstacionTipoEnum.CAJA || tipo === EstacionTipoEnum.MOZO;
    const ruta = estacionVentas ? (tipo === EstacionTipoEnum.MOZO ? '/mozo' : '/caja') : this.rutaVenta;
    const estacionCoincide = !this.contexto || (!!sesion?.TenantID && sesion.TenantID.toLowerCase() === this.contexto.tenantId.toLowerCase()
      && (!this.esEquipoCaja || sesion.Ip === this.contexto.identificadorEstacion));
    const responsable = [NivelUsuarioEnum.Gerente, NivelUsuarioEnum.Administrador].includes(usuario?.IdNivel);
    const nivelVentas = responsable || usuario?.IdNivel === (ruta === '/caja' ? NivelUsuarioEnum.Cajero : NivelUsuarioEnum.Mozo);
    const requiereLogin = !isJwtActive(sesion?.Token) || !usuario?.IdEmpleado || !sesion?.Ip || !estacionVentas || !estacionCoincide || !nivelVentas;
    return { ruta, requiereLogin };
  }

  async prepararRegresoOnline(trasLogin = false): Promise<DestinoVentasOnline> {
    if (this.ocupado) throw new Error('Espera a que termine la operación en curso.');
    this.ocupado = true;
    this.error = '';
    try {
      this.nube = await this.api.comprobarNube();
      if (!this.nube) throw new Error('La nube sigue sin conexión. Puedes continuar trabajando en la caja local.');
      const destino = this.destinoVentasOnline();
      const guardada = sessionStorage.getItem(CLAVE_CONTINGENCIA);
      const anterior = guardada || (this.contexto && this.identidadRegreso(this.contexto));
      const revision = anterior ? localStorage.getItem(PREFIJO_DIARIO + anterior) : null;
      const referencias = this.referenciasSinAcuse((this.contexto?.tenantId ?? this.storage.getCurrentSession()?.TenantID)?.toLowerCase(), this.base);
      if (!trasLogin && !this.activa && !guardada && !revision && !referencias.length && !this.estado?.regularizacionPendiente) {
        return { ...destino, returnUrl: destino.ruta };
      }
      const estado = await this.estadoParaRegreso(this.base, anterior);
      if (!estado.contexto || (this.contexto && !this.mismaCaja(this.contexto, estado.contexto))
          || (anterior && anterior !== this.identidadRegreso(estado.contexto))) {
        throw new Error('Comprueba la conexión con la misma sucursal y estación que atendieron las ventas sin internet.');
      }
      this.estado = estado;
      const identidad = this.identidadRegreso(estado.contexto);
      sessionStorage.setItem(CLAVE_CONTINGENCIA, identidad);
      const online = this.destinoVentasOnline();
      if (this.esEquipoCaja) {
        if (online.requiereLogin || this.storage.getCurrentSession()?.User?.TipoCompu !== EstacionTipoEnum.CAJA) {
          if (trasLogin) throw new Error('Inicia sesión con un operador habilitado para esta sucursal y estación de caja.');
          return { ...online, requiereLogin: true, returnUrl: RUTA_REGULARIZAR_CAJA };
        }
        await this.confirmarLotes();
      } else if (!estado.disponible || estado.regularizacionPendiente !== false) {
        if (estado.regularizacionPendiente) throw new Error('Hay operaciones pendientes. Espera a que la caja principal confirme el envío a la nube y vuelve a intentarlo.');
        throw new Error('Esta caja no informa si terminó el envío. Comprueba el envío en la PC de caja y vuelve al servicio online desde esa PC.');
      }
      if (!this.cerrarDiario(identidad, revision)) throw new Error('Se ha iniciado otra operación en esta caja. Vuelve a comprobar el envío.');
      sessionStorage.removeItem(CLAVE_CONTINGENCIA);
      return { ...online, returnUrl: online.ruta };
    } catch (error) {
      this.error = this.describirError(error, false);
      throw new Error(this.error);
    } finally {
      this.ocupado = false;
    }
  }

  private identidadRegreso(contexto: ContextoCaja, base = this.base): string {
    return JSON.stringify([base, contexto.tenantId.toLowerCase(), contexto.idCaja, contexto.identificadorEstacion]);
  }

  private cerrarDiario(identidad: string, revision: string | null): boolean {
    const clave = PREFIJO_DIARIO + identidad;
    if (localStorage.getItem(clave) !== revision) return false;
    localStorage.removeItem(clave);
    return true;
  }

  private referenciasSinAcuse(tenant: string, direccion?: string) {
    return Object.keys(localStorage).filter(clave => clave.startsWith('offline.envio|')).map(clave => {
      const [, base, sucursal, estacion, usuario, id] = clave.split('|');
      return { clave, base, sucursal, estacion: Number(estacion), usuario: Number(usuario), id };
    }).filter(r => r.sucursal?.toLowerCase() === tenant && (!direccion || r.base === direccion));
  }

  private async estadoParaRegreso(base: string, identidad: string | null): Promise<EstadoCaja> {
    const estado = await this.api.estado(base);
    if (!estado.contexto || (identidad && identidad !== this.identidadRegreso(estado.contexto, base))) return estado;
    const referencias = this.referenciasSinAcuse(estado.contexto.tenantId.toLowerCase(), base);
    if (!referencias.length) return estado;
    for (const referencia of referencias) {
      if (referencia.estacion !== estado.contexto.idEstacion || !await this.api.registrada(base, referencia.id, referencia.usuario)) {
        throw new Error('Hay un envío sin confirmar. Selecciona el operador que lo hizo y revisa la cuenta en «Revisar operaciones pendientes».');
      }
    }
    // Un envío sin acuse puede haberse guardado mientras se leía el primer estado.
    const actual = await this.api.estado(base);
    if (!this.mismaCaja(estado.contexto, actual.contexto)) throw new Error('La estación cambió al comprobar los envíos pendientes.');
    for (const referencia of referencias) localStorage.removeItem(referencia.clave);
    return actual;
  }

  private async confirmarLotes(): Promise<void> {
    const sesion = this.storage.getCurrentSession();
    const operador = await this.api.usuario(this.base, sesion.User.IdUsuario);
    if (!operador || operador.IdUsuario !== sesion.User.IdUsuario || operador.IdEmpleado !== sesion.User.IdEmpleado
        || operador.IdNivel !== sesion.User.IdNivel || operador.Activo === false) {
      throw new Error('El usuario de la sesión online no está habilitado en esta caja.');
    }
    // Un lote que ya estaba en vuelo puede tener operaciones posteriores en el diario.
    const confirmados = new Set<string>();
    while (true) {
      if (sesion !== this.storage.getCurrentSession() || !isJwtActive(sesion.Token)) {
        throw new Error('La sesión online ha cambiado. Vuelve a abrir ventas para confirmar el envío.');
      }
      const acuse = await this.api.gestionar(this.base, 'regularizar', sesion.Token) as { enviado?: boolean; id?: string; operaciones?: number };
      if (acuse?.enviado === false) {
        if (sesion !== this.storage.getCurrentSession() || !isJwtActive(sesion.Token)) throw new Error('Vuelve a iniciar sesión para abrir ventas.');
        return;
      }
      if (acuse?.enviado !== true || !acuse.id || !Number.isSafeInteger(acuse.operaciones) || acuse.operaciones < 1 || confirmados.has(acuse.id)) {
        throw new Error('La caja no confirmó el envío de las operaciones. Revisa las operaciones pendientes antes de abrir ventas.');
      }
      confirmados.add(acuse.id);
    }
  }

  get contexto(): ContextoCaja { return this.estado?.contexto; }
  get esEquipoCaja(): boolean { return this.base === URL_CAJA_LOCAL; }
  get puedeActualizarServicio(): boolean {
    if (!this.esEquipoCaja || !this.nube || !this.estado || (this.estado.versionProtocolo ?? 1) >= 2) return false;
    const vinculada = this.instalador.identidad;
    const instalada = this.estado.identidad ?? this.estado.contexto;
    return !!vinculada && !!instalada && vinculada.tenantId.toLowerCase() === instalada.tenantId?.toLowerCase()
      && vinculada.identificadorEstacion === instalada.identificadorEstacion;
  }
  get puedeGestionar(): boolean {
    const sesion = this.storage.getCurrentSession();
    return this.esEquipoCaja && isJwtActive(sesion?.Token) && (!this.contexto
      || sesion.TenantID?.toLowerCase() === this.contexto.tenantId?.toLowerCase());
  }
  get caja() { return this.maestros?.cajas.find(caja => caja.IdCaja === this.contexto?.idCaja); }
  get turno() { return this.maestros?.turnos.find(turno => turno.IdCaja === this.contexto?.idCaja && turno.Estado === 1); }
  get canales() { return NOMBRES_CANALES.filter(c => this.caja?.CanalesVenta?.includes(c.id)); }
  get productos() {
    const areas = new Set(this.maestros?.areas.filter(a => a.NombreImpresora?.trim()).map(a => a.IdAreaImpresion));
    return this.maestros?.productos.filter(p => p.Activo && p.Visible !== false && p.Tipo !== 3
      && (p.Tipo === 1 && !(p.IdSeccionMenu > 0) ? p.SeccionesMenu?.length
        : (p.Tipo !== 1 || p.VentaIndividual) && p.AreasImpresion?.length && p.AreasImpresion.every(id => areas.has(id)))) ?? [];
  }
  opciones(seccion: number, ids?: number[]): ProductoCaja[] {
    const areas = new Set(this.maestros.areas.filter(a => a.NombreImpresora?.trim()).map(a => a.IdAreaImpresion));
    return this.maestros.productos.filter(p => p.Activo && (ids ? p.IdSeccionMenu === seccion && ids.includes(p.IdProducto) : p.Tipo === 3)
      && p.AreasImpresion?.length && p.AreasImpresion.every(id => areas.has(id)));
  }
  get moneda() { return this.maestros?.monedas.find(m => m.EsOficial); }
  get esCajero(): boolean { return [NivelUsuarioEnum.Administrador, NivelUsuarioEnum.Cajero, NivelUsuarioEnum.Gerente].includes(this.usuario?.IdNivel); }
  get esResponsable(): boolean { return [NivelUsuarioEnum.Administrador, NivelUsuarioEnum.Gerente].includes(this.usuario?.IdNivel); }
  get permiteAnular(): boolean { return this.esEquipoCaja && (this.esResponsable || (this.esCajero && this.usuario.PuedeAprobarSolicitudes)); }
  get permiteDescuento(): boolean { return this.esEquipoCaja && (this.esResponsable || (this.esCajero && this.usuario.PuedeAplicarDescuento)); }
  get documentos() { return this.maestros?.documentos.filter(d => [1, 2, 5, 9].includes(d.IdTipoDocumento)) ?? []; }

  conectar(): Promise<void> {
    return this.ejecutar(async () => {
      this.limpiarOperador();
      this.usuarios = [];
      this.estado = undefined;
      this.nube = undefined;
      this.servicioInaccesible = false;
      this.base = normalizarDireccionCaja(this.direccion);
      const [local, nube] = await Promise.allSettled([this.api.estado(this.base), this.api.comprobarNube()]);
      this.nube = nube.status === 'fulfilled' && nube.value;
      if (local.status === 'rejected') throw local.reason;
      this.estado = local.value;
      localStorage.setItem('offline.direccionCaja', this.base);
      if (this.estado.disponible) this.usuarios = await this.api.usuarios(this.base);
    }, true);
  }

  descargarInstalador(): Promise<void> {
    return this.ejecutar(async () => {
      if (!this.esEquipoCaja || !this.nube) throw new Error('Conecta esta caja a internet para descargar el instalador.');
      const identidad = await this.instalador.descargar();
      this.sincronizacion.esperarInstalacion(identidad.tenantId, identidad.identificadorEstacion);
      this.mensaje = 'Abre ' + nombreInstalador + ' en esta PC y mantén esta sesión abierta mientras se prepara la caja.';
    });
  }

  descargarActualizacionServicio(): Promise<void> {
    return this.ejecutar(async () => {
      if (!this.puedeActualizarServicio) throw new Error('Comprueba la conexión y la vinculación de esta estación antes de actualizar.');
      await this.instalador.descargar();
      this.mensaje = 'Abre ' + nombreInstalador + ' en esta PC. La nueva versión se iniciará la próxima vez que inicies sesión en Windows.';
    });
  }

  entrar(usarSesionActual = false): Promise<void> {
    return this.ejecutar(async () => {
      const generacion = this.generacion;
      const contextoElegido = this.contexto;
      const sesion = usarSesionActual ? this.storage.getCurrentSession() : null;
      const estado = await this.api.estado(this.base);
      if (contextoElegido && !this.mismaCaja(contextoElegido, estado.contexto)) {
        throw new Error('La estación ha cambiado. Vuelve a comprobar la conexión y selecciona tu usuario.');
      }
      this.estado = estado;
      this.nube = await this.api.comprobarNube();
      if (!this.estado.disponible || !this.contexto) throw new Error(this.estado.mensaje || 'La caja aún no está preparada.');
      if (usarSesionActual && (this.nube || !isJwtActive(sesion?.Token) || !sesion.User?.IdUsuario
          || sesion.TenantID?.trim().toLowerCase() !== this.contexto.tenantId.toLowerCase()
          || sesion.Ip !== this.contexto.identificadorEstacion)) return;
      const idUsuario = usarSesionActual ? sesion.User.IdUsuario : this.idUsuario;
      if (!idUsuario) throw new Error('Selecciona tu usuario.');
      const elegido = await this.api.usuario(this.base, idUsuario);
      if (elegido?.IdUsuario !== idUsuario || !elegido.IdEmpleado || ![1, 2, 3, 4].includes(elegido.IdNivel)) {
        throw new Error('Este usuario no puede operar en caja.');
      }
      if (usarSesionActual && (elegido.IdNivel !== sesion.User.IdNivel || elegido.IdEmpleado !== sesion.User.IdEmpleado)) return;
      await this.actualizar();
      if (generacion !== this.generacion || this.destruido) return;
      if (usarSesionActual && (sesion !== this.storage.getCurrentSession() || !isJwtActive(sesion.Token))) return;
      if (!this.turno) throw new Error('La copia de la caja no contiene un turno abierto.');
      this.usuario = elegido;
      this.idUsuario = idUsuario;
      this.enVenta = !this.nube;
      if (this.enVenta) {
        this.conexionNube?.unsubscribe();
        this.conexionNube = observarConexionNube(() => this.api.comprobarNube(), 60000)
          .subscribe(disponible => this.nube = disponible);
        sessionStorage.setItem(CLAVE_SESION_LOCAL, '1');
        sessionStorage.setItem(CLAVE_CONTINGENCIA, this.identidadRegreso(this.contexto));
      }
      else sessionStorage.removeItem(CLAVE_SESION_LOCAL);
      this.cargarReintentos();
      if (this.esEquipoCaja) {
        const cola = this.actualizarImpresiones(true).catch(() => {
          if (this.generacion === generacion) this.error = 'Revisa la cola de impresión de la caja.';
        });
        if (!this.enVenta) await cola;
        clearInterval(this.sondeo);
        if (!this.destruido) this.sondeo = setInterval(() => {
          if (!this.ocupado) void this.actualizarImpresiones(true).catch(() => undefined);
        }, 10000);
      }
    });
  }

  salir(): void {
    this.limpiarOperador();
    this.idUsuario = undefined;
    this.mensaje = '';
    this.error = '';
    sessionStorage.removeItem(CLAVE_SESION_LOCAL);
  }

  gestionar(accion: 'sincronizar' | 'regularizar'): Promise<void> {
    return this.ejecutar(async () => {
      if (!this.puedeGestionar) throw new Error('Inicia sesión online desde el equipo de caja.');
      const resultado = await this.api.gestionar(this.base, accion, this.storage.getCurrentToken()) as { enviado?: boolean };
      const estado = await this.api.estado(this.base);
      if (this.usuario && !this.mismaCaja(this.contexto, estado.contexto)) {
        this.salir();
        this.usuarios = [];
        this.estado = undefined;
        throw new Error('La estación ha cambiado. Vuelve a comprobar la conexión.');
      }
      this.estado = estado;
      if (accion === 'sincronizar' && this.estado.contexto) {
        await this.api.prepararImpresionLocal();
        this.sincronizacion.recordar(this.estado.contexto);
      }
      this.nube = await this.api.comprobarNube();
      if (this.estado.disponible) this.usuarios = await this.api.usuarios(this.base);
      this.mensaje = accion === 'sincronizar' ? 'Copia local actualizada.'
        : resultado?.enviado === false ? 'No quedan operaciones pendientes de envío.' : 'La nube ha recibido las operaciones pendientes.';
      if (this.usuario) await this.actualizar();
    });
  }

  async actualizar(): Promise<void> {
    const contexto = this.contexto;
    const generacion = this.generacion;
    const antes = await this.api.estado(this.base);
    const [cuentas, maestros] = await Promise.all([this.api.pedidos(this.base), this.api.maestros(this.base)]);
    const despues = await this.api.estado(this.base);
    if (generacion !== this.generacion || ![antes, despues].every(e =>
      e.disponible && e.version === maestros.version && this.mismaCaja(contexto, e.contexto))) {
      throw new Error('La copia de la caja ha cambiado. Vuelve a conectarte para actualizar las cuentas.');
    }
    this.cuentas = cuentas.filter(c => [1, 6].includes(c.contenido.Estado) && c.contenido.IdCaja === this.contexto.idCaja);
    this.maestros = maestros;
    this.estado = despues;
  }

  async registrarOperacion(ruta: RutaOperacion, datos: object): Promise<RespuestaOperacion> {
    if (!this.activa) throw new Error('Selecciona tu usuario en la caja local.');
    if (this.ocupado) throw new Error('Espera a que termine la operación en curso.');
    this.ocupado = true;
    this.mensaje = '';
    this.error = '';
    try {
      return await this.enviar(ruta, datos);
    } catch (error) {
      this.error = this.describirError(error, false);
      throw new Error(this.error);
    } finally {
      this.ocupado = false;
    }
  }

  private async enviar(ruta: RutaOperacion, datos: object): Promise<RespuestaOperacion> {
    const anterior = this.pendientes[0];
    const { accion, referenciaPedido } = datos as { accion?: string; referenciaPedido?: string };
    if (anterior && (!anterior.reintroducir || anterior.ruta !== ruta || anterior.accion !== accion
        || (anterior.referenciaPedido && anterior.referenciaPedido !== referenciaPedido))) {
      throw new Error('Completa o comprueba la operación pendiente antes de iniciar otra.');
    }
    const generacion = this.generacion;
    const [nube, estado] = await Promise.all([this.api.comprobarNube(), this.api.estado(this.base)]);
    this.nube = nube;
    if (this.generacion !== generacion || !this.activa || !estado.disponible
        || !this.mismaCaja(this.contexto, estado.contexto) || estado.version !== this.maestros.version) {
      throw new Error('La copia de la caja ha cambiado. Actualiza las cuentas antes de continuar.');
    }
    if (this.nube) throw new Error('La conexión se ha recuperado. Envía las operaciones pendientes desde la caja y continúa en el servicio online.');
    const id = anterior?.id || crypto.randomUUID();
    const operacion: OperacionCaja = { ruta, datos: { ...datos, idOperacion: id,
      idEstacion: this.contexto.idEstacion, idUsuario: this.usuario.IdUsuario, versionMaestros: this.maestros.version } };
    const pendiente: EnvioPendiente = { id, ruta, accion, referenciaPedido };
    localStorage.setItem(this.prefijo() + id, JSON.stringify(pendiente));
    localStorage.setItem(PREFIJO_DIARIO + this.identidadRegreso(this.contexto), id);
    this.pendientes = [pendiente];
    this.datosEnMemoria.set(id, operacion);
    return this.reenviar(pendiente);
  }

  private async reenviar(pendiente: EnvioPendiente): Promise<RespuestaOperacion> {
    const operacion = this.datosEnMemoria.get(pendiente.id);
    const generacion = this.generacion;
    const clave = this.prefijo() + pendiente.id;
    let respuesta: RespuestaOperacion;
    try {
      respuesta = await this.api.operar(this.base, operacion);
    } catch (error) {
      if (error instanceof HttpErrorResponse && [400, 403, 409, 413, 415, 422].includes(error.status)) {
        this.datosEnMemoria.delete(pendiente.id);
        pendiente.reintroducir = true;
      }
      throw error;
    }
    localStorage.removeItem(clave);
    if (generacion !== this.generacion) return respuesta;
    this.quitarDeMemoria(pendiente);
    this.mensaje = operacion.ruta === 'cobros' ? 'Cobro guardado. El comprobante queda pendiente de regularización.'
      : 'Operación guardada en caja.' + (respuesta.plan ? ' La comanda está en la cola de impresión.' : '');
    // El acuse ya confirma el guardado aunque después falle la lectura o QZ.
    try {
      await this.actualizar();
      if (this.esEquipoCaja) void this.actualizarImpresiones(true).catch(() => {
        if (this.generacion === generacion) this.error = 'La operación está guardada. Revisa las impresiones pendientes.';
      });
    } catch {
      this.error = 'La operación está guardada. Actualiza las cuentas y revisa las impresiones pendientes.';
    }
    return respuesta;
  }

  private prefijo() { return ['offline.envio', this.base, this.contexto.tenantId, this.contexto.idEstacion, this.usuario.IdUsuario, ''].join('|'); }

  private cargarReintentos(): void {
    const prefijo = this.prefijo();
    this.pendientes = Object.keys(localStorage).filter(k => k.startsWith(prefijo))
      .map(k => JSON.parse(localStorage.getItem(k)) as EnvioPendiente);
  }

  private quitarDeMemoria(pendiente: EnvioPendiente): void {
    this.pendientes = this.pendientes.filter(o => o.id !== pendiente.id);
    this.datosEnMemoria.delete(pendiente.id);
  }

  async actualizarImpresiones(automatico: boolean): Promise<void> {
    if (this.imprimiendo || !this.usuario || !this.esEquipoCaja || !this.estado?.capacidades?.impresion) return;
    this.imprimiendo = true;
    try {
      const { base, contexto, usuario, generacion } = this;
      const listar = () => this.impresion.listarPendientes(base, contexto.idEstacion, usuario.IdUsuario, true);
      const pendientes = await listar();
      if (this.generacion !== generacion) return;
      this.impresiones = pendientes;
      if (!automatico) return;
      for (const item of this.impresiones) {
        if (this.generacion !== generacion || this.destruido || !item.plan || this.impresionesIntentadas.has(item.plan.idOperacion)
          || item.estados.some(e => e.estado === 'enviando')) continue;
        this.impresionesIntentadas.add(item.plan.idOperacion);
        await this.impresion.reanudar(this.base, item.plan);
      }
      const restantes = await listar();
      if (this.generacion === generacion) this.impresiones = restantes;
    } finally { this.imprimiendo = false; }
  }

  resolverImpresion(plan: IdentidadImpresionLocal, indice?: number, intento?: string, decision?: 'impresa' | 'reimprimir'): Promise<void> {
    return this.ejecutar(async () => {
      if (!this.esEquipoCaja || this.imprimiendo) throw new Error('La caja está imprimiendo. Inténtalo de nuevo.');
      this.imprimiendo = true;
      try {
        if (decision) await this.impresion.resolver(this.base, plan, indice, intento, decision);
        const resultado = await this.impresion.reanudar(this.base, plan);
        this.mensaje = resultado.estado === 'confirmada' ? 'Impresión confirmada.' : 'Revisa el estado de la comanda en caja.';
      } finally { this.imprimiendo = false; }
      await this.actualizarImpresiones(false);
    });
  }

  refrescar(): Promise<void> {
    return this.ejecutar(async () => {
      this.nube = await this.api.comprobarNube();
      await this.actualizar();
      await this.actualizarImpresiones(false);
    });
  }
  comprobarEnvio(pendiente: EnvioPendiente): Promise<void> {
    return this.ejecutar(async () => {
      const generacion = this.generacion;
      const clave = this.prefijo() + pendiente.id;
      const estado = await this.api.estado(this.base);
      if (generacion !== this.generacion || !this.mismaCaja(this.contexto, estado.contexto)) {
        throw new Error('Comprueba la conexión con la estación donde se inició la operación.');
      }
      if (await this.api.registrada(this.base, pendiente.id, this.usuario.IdUsuario)) {
        localStorage.removeItem(clave);
        if (generacion !== this.generacion) return;
        this.quitarDeMemoria(pendiente);
        await this.actualizar();
        this.mensaje = 'La caja confirma que ya guardó la operación.';
        return;
      }
      this.nube = await this.api.comprobarNube();
      if (generacion !== this.generacion) return;
      if (this.nube) {
        pendiente.sinRegistro = true;
        this.mensaje = 'La caja aún no ha confirmado este envío. Revisa la cuenta antes de continuar en el servicio online.';
        return;
      }
      if (this.datosEnMemoria.has(pendiente.id)) {
        await this.reenviar(pendiente);
        return;
      }
      pendiente.reintroducir = true;
      this.mensaje = 'La caja aún no tiene esta operación. Puedes volver a introducirla con la misma referencia cuando trabajes sin conexión.';
    });
  }

  cerrarEnvioRevisado(pendiente: EnvioPendiente): Promise<void> {
    return this.ejecutar(async () => {
      if (!pendiente.sinRegistro || !this.pendientes.includes(pendiente)) return;
      const generacion = this.generacion;
      const contexto = this.contexto;
      const clave = this.prefijo() + pendiente.id;
      const estado = await this.api.estado(this.base);
      if (generacion !== this.generacion || !this.mismaCaja(contexto, estado.contexto)) return;
      const registrada = await this.api.registrada(this.base, pendiente.id, this.usuario.IdUsuario);
      if (generacion !== this.generacion) return;
      localStorage.removeItem(clave);
      this.quitarDeMemoria(pendiente);
      this.mensaje = registrada ? 'La caja ha confirmado el envío.' : 'Revisión completada. La caja no ha registrado esta operación.';
    });
  }

  private mismaCaja(a?: ContextoCaja, b?: ContextoCaja): boolean {
    return !!a && !!b && a.tenantId === b.tenantId && a.idEstacion === b.idEstacion
      && a.identificadorEstacion === b.identificadorEstacion && a.idCaja === b.idCaja;
  }

  private limpiarOperador(): void {
    clearInterval(this.sondeo);
    this.conexionNube?.unsubscribe();
    this.generacion++;
    this.usuario = undefined;
    this.enVenta = false;
    this.maestros = undefined;
    this.cuentas = [];
    this.impresiones = [];
    this.impresionesIntentadas.clear();
    this.pendientes = [];
    this.datosEnMemoria.clear();
  }

  private async ejecutar(trabajo: () => Promise<void>, comprobandoConexion = false): Promise<void> {
    if (this.ocupado) return;
    this.ocupado = true;
    this.error = '';
    this.mensaje = '';
    try { await trabajo(); }
    catch (error) {
      this.error = this.describirError(error, comprobandoConexion);
    } finally { this.ocupado = false; }
  }

  private describirError(error: unknown, comprobandoConexion: boolean): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.mensaje === 'string' && error.error.mensaje.trim()) {
      return error.error.mensaje;
    }
    const tiempoAgotado = error instanceof Error && error.name === 'TimeoutError';
    const estadoHttp = error instanceof HttpErrorResponse ? error.status : undefined;
    if (comprobandoConexion && (tiempoAgotado || estadoHttp !== undefined)) {
      if (tiempoAgotado || [0, 502, 503, 504].includes(estadoHttp)) {
        this.servicioInaccesible = this.esEquipoCaja && !this.estado;
        return `No se pudo conectar con la caja en ${this.base}. Comprueba que el servicio de caja esté iniciado y que permita el acceso desde ${window.location.origin}.`;
      }
      if (estadoHttp === 403) return `Acceso denegado. Comprueba que el servicio de caja permita el origen ${window.location.origin}.`;
      if (estadoHttp === 404 || (estadoHttp >= 200 && estadoHttp < 300)) {
        return `La dirección ${this.base} no devolvió la respuesta esperada del servicio de caja. Comprueba la dirección y el puerto.`;
      }
      return `No se pudo consultar la caja en ${this.base} (HTTP ${estadoHttp}).`;
    }
    if (tiempoAgotado || (error instanceof HttpErrorResponse && [0, 502, 503, 504].includes(error.status))) {
      return 'No se recibió confirmación de la caja. Comprueba la conexión y revisa los envíos pendientes.';
    }
    if (error instanceof HttpErrorResponse) return `La solicitud a la caja falló (HTTP ${error.status}).`;
    return error instanceof Error ? error.message : 'La operación no se pudo completar.';
  }
}
