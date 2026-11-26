import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { QzTrayV224Service } from '../services/qz-tray-v224.service';

export interface ComandaLocalParaImprimir {
  impresora: string;
  datos: Record<string, unknown>;
}

export interface IdentidadImpresionLocal {
  idOperacion: string;
  idOperacionPedido: string;
  idEstacion: number;
  idUsuario: number;
  numeroOffline: string;
}

export interface ResultadoImpresionLocal {
  estado: 'confirmada' | 'fallo-impresion' | 'confirmacion-pendiente';
  impresorasAceptadas: string[];
  siguienteIndice: number;
}

/** Coordina la impresión local sin alterar el indicador de conexión con la nube. */
@Injectable({ providedIn: 'root' })
export class OfflineImpresionService {
  private readonly localHttp: HttpClient;

  constructor(backend: HttpBackend, private readonly qz: QzTrayV224Service) {
    // El interceptor global mide la conexión con la nube; una respuesta de caja
    // no debe marcar ese servidor como recuperado.
    this.localHttp = new HttpClient(backend);
  }

  async imprimir(
    urlCaja: string,
    identidad: IdentidadImpresionLocal,
    comandas: ComandaLocalParaImprimir[],
    progreso?: Pick<ResultadoImpresionLocal, 'impresorasAceptadas' | 'siguienteIndice'>,
  ): Promise<ResultadoImpresionLocal> {
    const base = this.normalizarUrl(urlCaja);
    if (!Array.isArray(comandas) || comandas.length === 0) {
      return { estado: 'fallo-impresion', impresorasAceptadas: [], siguienteIndice: 0 };
    }
    if (comandas.some(comanda => !comanda || typeof comanda.impresora !== 'string'
        || !comanda.impresora.trim() || !comanda.datos || typeof comanda.datos !== 'object'
        || Array.isArray(comanda.datos))) {
      throw new TypeError('Los datos de impresión no son válidos.');
    }
    const inicio = progreso?.siguienteIndice ?? 0;
    const impresorasPrevias = progreso?.impresorasAceptadas ?? [];
    if (!Number.isSafeInteger(inicio) || inicio < 0 || inicio > comandas.length
        || !Array.isArray(impresorasPrevias) || impresorasPrevias.some(item => typeof item !== 'string' || !item.trim())
        || (inicio === 0 && impresorasPrevias.length > 0) || (inicio > 0 && impresorasPrevias.length === 0)) {
      throw new TypeError('El progreso de impresión no es válido.');
    }
    const aceptadas = new Map<string, string>(impresorasPrevias.map(item => [item.trim().toLowerCase(), item.trim()]));
    const esperadas = new Set(comandas.slice(0, inicio).map(item => item.impresora.trim().toLowerCase()));
    if (aceptadas.size !== impresorasPrevias.length || aceptadas.size !== esperadas.size
        || [...aceptadas.keys()].some(nombre => !esperadas.has(nombre))) {
      throw new TypeError('El progreso de impresión no corresponde a las comandas.');
    }
    for (let indice = inicio; indice < comandas.length; indice++) {
      const comanda = comandas[indice];
      try {
        const html = await firstValueFrom(this.localHttp.post<string>(`${base}/api/impresiones/preparar`, comanda.datos));
        if (!await this.qz.imprimirComandaOffline(html, comanda.impresora)) {
          return { estado: 'fallo-impresion', impresorasAceptadas: [...aceptadas.values()], siguienteIndice: indice };
        }
        aceptadas.set(comanda.impresora.trim().toLowerCase(), comanda.impresora.trim());
      } catch {
        return { estado: 'fallo-impresion', impresorasAceptadas: [...aceptadas.values()], siguienteIndice: indice };
      }
    }
    const impresorasAceptadas = [...aceptadas.values()];
    const confirmada = await this.confirmar(base, identidad, impresorasAceptadas);
    return { estado: confirmada ? 'confirmada' : 'confirmacion-pendiente',
      impresorasAceptadas, siguienteIndice: comandas.length };
  }

  /** Permite reintentar un acuse perdido sin volver a imprimir las comandas. */
  async confirmar(urlCaja: string, identidad: IdentidadImpresionLocal, impresoras: string[]): Promise<boolean> {
    const base = this.normalizarUrl(urlCaja);
    try {
      const respuesta = await firstValueFrom(this.localHttp.post<{ resultado: string }>(
        `${base}/api/impresiones/confirmar`, { ...identidad, impresoras },
      ));
      return respuesta?.resultado === 'registrada' || respuesta?.resultado === 'existente';
    } catch {
      return false;
    }
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
