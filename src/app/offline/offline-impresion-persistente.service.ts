import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { QzTrayV224Service } from '../services/qz-tray-v224.service';
import { ComandaLocalParaImprimir, IdentidadImpresionLocal } from './offline-impresion.service';

export interface EstadoComandaLocal {
  estado: 'pendiente' | 'enviando' | 'aceptada';
  idIntento: string | null;
}

export interface ProgresoComandasLocal {
  estados: EstadoComandaLocal[];
  plan?: IdentidadImpresionLocal & { trabajos: ComandaLocalParaImprimir[] };
}

export interface ResultadoImpresionPersistente {
  estado: 'confirmada' | 'caja-no-disponible' | 'revision-pendiente' | 'confirmacion-pendiente';
  indice?: number;
  idIntento?: string;
}

/** Coordina cada envío con su estado persistido en los archivos de caja. */
@Injectable({ providedIn: 'root' })
export class OfflineImpresionPersistenteService {
  private readonly localHttp: HttpClient;

  constructor(backend: HttpBackend, private readonly qz: QzTrayV224Service) {
    this.localHttp = new HttpClient(backend);
  }

  /** Permite localizar en caja los planes pendientes después de reiniciar. */
  listarPendientes(urlCaja: string, idEstacion: number, idUsuario: number, todaLaEstacion = false): Promise<ProgresoComandasLocal[]> {
    const base = this.normalizarUrl(urlCaja);
    return firstValueFrom(this.localHttp.post<ProgresoComandasLocal[]>(
      `${base}/api/impresiones/pendientes`, { idEstacion, idUsuario, ...(todaLaEstacion ? { todaLaEstacion: true } : {}) },
    ));
  }

  /** Recupera de caja el plan original sin depender de la memoria del navegador. */
  async reanudar(urlCaja: string, identidad: IdentidadImpresionLocal): Promise<ResultadoImpresionPersistente> {
    const base = this.normalizarUrl(urlCaja);
    let progreso: ProgresoComandasLocal;
    try {
      progreso = await this.progreso(base, { accion: 'consultar', ...identidad });
    } catch {
      return { estado: 'caja-no-disponible' };
    }
    const plan = progreso?.plan;
    if (!plan || plan.idOperacion !== identidad.idOperacion || plan.idOperacionPedido !== identidad.idOperacionPedido
        || plan.idEstacion !== identidad.idEstacion || plan.idUsuario !== identidad.idUsuario
        || plan.numeroOffline !== identidad.numeroOffline || !Array.isArray(plan.trabajos)) {
      return { estado: 'caja-no-disponible' };
    }
    return this.continuar(base, identidad, plan.trabajos);
  }

  async continuar(urlCaja: string, identidad: IdentidadImpresionLocal,
    comandas: ComandaLocalParaImprimir[]): Promise<ResultadoImpresionPersistente> {
    const base = this.normalizarUrl(urlCaja);
    let progreso: ProgresoComandasLocal;
    try {
      progreso = await this.progreso(base, { accion: 'crear', ...identidad, trabajos: comandas });
    } catch {
      return { estado: 'caja-no-disponible' };
    }
    if (!Array.isArray(progreso?.estados) || progreso.estados.length !== comandas.length) {
      return { estado: 'caja-no-disponible' };
    }
    for (let indice = 0; indice < progreso.estados.length; indice++) {
      const estado = progreso.estados[indice];
      if (estado.estado === 'aceptada') continue;
      if (estado.estado === 'enviando' && estado.idIntento) {
        return { estado: 'revision-pendiente', indice, idIntento: estado.idIntento };
      }
      if (estado.estado !== 'pendiente') return { estado: 'caja-no-disponible' };
      const idIntento = globalThis.crypto.randomUUID();
      try {
        // Se registra antes de llamar a QZ. Si se pierde la respuesta, se pide
        // revisar la comanda en vez de imprimirla de nuevo automáticamente.
        await this.progreso(base, { accion: 'iniciar', ...identidad, indice, idIntento });
        const comanda = comandas[indice];
        const fecha = new Date(comanda.datos['fechaUtc'] as string);
        const fechaLocal = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(fecha);
        const html = await firstValueFrom(this.localHttp.post<string>(`${base}/api/impresiones/preparar`,
          { ...comanda.datos, fechaLocal }));
        if (!await this.qz.imprimirComandaOffline(html, comanda.impresora)) {
          return { estado: 'revision-pendiente', indice, idIntento };
        }
        await this.progreso(base, { accion: 'aceptar', ...identidad, indice, idIntento });
      } catch {
        return { estado: 'revision-pendiente', indice, idIntento };
      }
    }
    const nombres = new Map<string, string>();
    for (const comanda of comandas) nombres.set(comanda.impresora.trim().toLowerCase(), comanda.impresora.trim());
    try {
      const resultado = await firstValueFrom(this.localHttp.post<{ resultado: string }>(
        `${base}/api/impresiones/confirmar`, { ...identidad, impresoras: [...nombres.values()] },
      ));
      return { estado: ['registrada', 'existente'].includes(resultado?.resultado)
        ? 'confirmada' : 'confirmacion-pendiente' };
    } catch {
      return { estado: 'confirmacion-pendiente' };
    }
  }

  /** Registra la decisión del usuario después de revisar la comanda física. */
  async resolver(urlCaja: string, identidad: IdentidadImpresionLocal, indice: number,
    idIntento: string, decision: 'impresa' | 'reimprimir'): Promise<void> {
    await this.progreso(this.normalizarUrl(urlCaja), { accion: 'resolver', ...identidad, indice, idIntento, decision });
  }

  private progreso(base: string, datos: object): Promise<ProgresoComandasLocal> {
    return firstValueFrom(this.localHttp.post<ProgresoComandasLocal>(`${base}/api/impresiones/progreso`, datos));
  }

  private normalizarUrl(valor: string): string {
    const url = new URL(valor);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
        || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) {
      throw new TypeError('La dirección del servidor de caja no es válida.');
    }
    return url.origin;
  }
}
