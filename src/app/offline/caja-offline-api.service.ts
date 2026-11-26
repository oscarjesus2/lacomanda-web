import { HttpBackend, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IdentidadImpresionLocal } from './offline-impresion.service';
import { Producto } from '../models/product.models';
import { Usuario } from '../models/usuario.models';
import { Espacios } from '../models/espacios.models';
import { Descuento } from '../models/descuento.models';
import { Tarjeta } from '../models/tarjeta.models';
import { Turno } from '../models/turno.models';
import { PedidoCab } from '../models/pedido.models';

export const URL_CAJA_LOCAL = 'http://127.0.0.1:17861';

export interface ContextoCaja {
  tenantId: string;
  identificadorEstacion: string;
  idEstacion: number;
  idCaja: number;
  paisISO2?: string;
  cultura?: string;
  zonaHorariaId?: string;
}

export interface EstadoCaja {
  disponible: boolean;
  versionProtocolo?: number;
  regularizacionPendiente?: boolean;
  version: number | null;
  mensaje: string;
  contexto?: ContextoCaja;
  identidad?: Pick<ContextoCaja, 'tenantId' | 'identificadorEstacion'>;
  capacidades?: { pedidos: boolean; impresion: boolean; cobros: boolean; modificaciones?: boolean };
}

export interface CuentaLocal {
  identificador: string;
  contenido: PedidoCab & { TieneAnticiposOnline?: boolean; NroPedidoOffline?: string; FecReg?: string };
  version: number;
}
export interface DocumentoCaja { IdTipoDocumento: number; Descripcion: string }
export interface CajaLocal { IdCaja: number; Descripcion: string; CanalesVenta: number[]; IdCanalVentaDefecto?: number; PermiteDividirPedido?: boolean; PermiteVentaCredito: boolean }
export interface MesaCaja extends Espacios { Ambiente?: string; PosicionAmbiente?: number }
export interface TipoPagoLocal { IdTipoPago: number; Descripcion: string }
export interface SocioLocal { IdSocioNegocio: number; Descripcion: string }
export interface ClienteDeliveryLocal {
  IdCliente: number; Item: number; NombresDelivery: string; DireccionDelivery: string;
  TelefonoDelivery?: string; AnexoDelivery?: string; ReferenciaDelivery?: string; PrecioDelivery?: number;
}
export interface MonedaLocal { IdMoneda: string; Descripcion: string; Simbolo: string; EsOficial: boolean }
export interface ProductoCaja extends Producto {
  EsCargoDelivery?: boolean;
  IdSeccionMenu?: number;
  AreasImpresion: number[];
  SeccionesMenu?: { IdSeccionMenu: number; Descripcion: string; Cantidad: number; EsOpcional: boolean; Opciones: number[] }[];
  PreciosSocio?: { IdSocioNegocio: number; Precio: number }[];
}
export interface TipoIdentidadLocal {
  IdTipoIdentidad: string; Activo: boolean; RequiereParaFactura: boolean; Descripcion: string; Abreviatura: string; RegexValidacion?: string;
}

export type RutaOperacion = 'pedidos' | 'pedidos/modificar' | 'cobros';
export interface OperacionCaja { ruta: RutaOperacion; datos: { idOperacion: string; idUsuario: number; idEstacion: number; [campo: string]: unknown } }
export interface RespuestaOperacion { resultado: string; numeroOffline?: string; referenciaPedido?: string; referenciaDestino?: string; plan?: IdentidadImpresionLocal }

export function normalizarDireccionCaja(valor: string): string {
  const url = new URL(valor);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
      || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Indica la dirección del servidor de caja, con http o https y su puerto.');
  }
  if (url.protocol === 'http:' && !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
    throw new Error('La dirección de la caja en la red local debe usar HTTPS.');
  }
  return url.origin;
}

@Injectable({ providedIn: 'root' })
export class CajaOfflineApiService {
  private readonly http: HttpClient;
  constructor(backend: HttpBackend) { this.http = new HttpClient(backend); }

  async comprobarNube(): Promise<boolean> {
    try {
      const health = new URL('/health', environment.apiUrl);
      // El service worker debe consultar la red, incluso al reabrir la PWA.
      health.searchParams.set('ngsw-bypass', 'true');
      await firstValueFrom(this.http.get(health.toString(), { responseType: 'text' }).pipe(timeout(5000)));
      return true;
    } catch (error) {
      return error instanceof HttpErrorResponse && error.status > 0 && error.status < 500;
    }
  }

  async estado(base: string): Promise<EstadoCaja> {
    const estado = await this.get<EstadoCaja>(base, 'estado');
    if (typeof estado?.disponible !== 'boolean' || typeof estado.mensaje !== 'string') {
      throw new Error('La dirección indicada no devolvió el estado de una caja de La Comanda. Comprueba la dirección y el puerto.');
    }
    return estado;
  }
  usuarios(base: string): Promise<Usuario[]> { return this.get(base, 'usuarios'); }
  usuario(base: string, id: number): Promise<Usuario> { return this.get(base, 'usuarios/' + id); }
  pedidos(base: string): Promise<CuentaLocal[]> { return this.get(base, 'pedidos'); }
  async registrada(base: string, idOperacion: string, idUsuario: number): Promise<boolean> {
    try {
      const resultado = await this.get<{ registrada: boolean; idOperacion: string }>(base,
        'operaciones/' + encodeURIComponent(idOperacion) + '?idUsuario=' + idUsuario);
      if (!resultado.registrada || resultado.idOperacion !== idOperacion) throw new Error('La caja no confirmó la referencia del envío.');
      return true;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) return false;
      throw error;
    }
  }

  async maestros(base: string) {
    let version: number;
    const leer = async <T>(nombre: string) => {
      const respuesta = await this.get<{ version: number; datos: T[] }>(base, 'maestros/' + nombre);
      if (!Number.isSafeInteger(respuesta.version) || (version !== undefined && version !== respuesta.version)) {
        throw new Error('La copia de caja ha cambiado. Actualiza antes de continuar.');
      }
      version = respuesta.version;
      return respuesta.datos;
    };
    const [productos, mesas, cajas, turnos, monedas, documentos, tarjetas, socios, clientes, tiposPago, descuentos, identidades, areas] = await Promise.all([
      leer<ProductoCaja>('productos'), leer<MesaCaja>('mesas'), leer<CajaLocal>('cajas'), leer<Turno>('turnos'),
      leer<MonedaLocal>('monedas'), leer<DocumentoCaja>('documentos'), leer<Tarjeta>('tarjetas'), leer<SocioLocal>('socios'),
      leer<ClienteDeliveryLocal>('clientesdelivery'), leer<TipoPagoLocal>('tipospago'), leer<Descuento>('descuentos'),
      leer<TipoIdentidadLocal>('tiposidentidad'), leer<{ IdAreaImpresion: number; NombreImpresora: string }>('areas'),
    ]);
    return { version, productos, mesas, cajas, turnos, monedas, documentos, tarjetas, socios, clientes, tiposPago, descuentos, identidades, areas };
  }

  operar(base: string, operacion: OperacionCaja): Promise<RespuestaOperacion> {
    return firstValueFrom(this.http.post<RespuestaOperacion>(normalizarDireccionCaja(base) + '/api/' + operacion.ruta,
      operacion.datos).pipe(timeout(30000)));
  }

  gestionar(base: string, accion: 'sincronizar' | 'regularizar', token: string): Promise<unknown> {
    if (normalizarDireccionCaja(base) !== URL_CAJA_LOCAL || !token) throw new Error('Abre esta opción en la caja con tu sesión online.');
    return firstValueFrom(this.http.post(URL_CAJA_LOCAL + '/api/' + accion, {},
      { headers: { Authorization: 'Bearer ' + token } }).pipe(timeout(120000)));
  }

  async prepararImpresionLocal(): Promise<void> {
    // La PWA guarda los recursos de firma al preparar la computadora que imprime.
    await Promise.all(['certificate.pem', 'private-key.pem'].map(nombre =>
      firstValueFrom(this.http.get('/assets/signing/' + nombre, { responseType: 'text' }).pipe(timeout(10000)))));
  }

  private get<T>(base: string, recurso: string): Promise<T> {
    return firstValueFrom(this.http.get<T>(normalizarDireccionCaja(base) + '/api/' + recurso,
      { params: { 'ngsw-bypass': 'true' } }).pipe(timeout(8000)));
  }
}

export type MaestrosCaja = Awaited<ReturnType<CajaOfflineApiService['maestros']>>;

