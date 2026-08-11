import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { environment } from 'src/environments/environment';
import { StorageService } from './storage.service';

interface EstadoAgenteLocal {
  Configurado: boolean;
  QzDisponible: boolean;
  IdentificadorEstacion?: string;
}

interface CredencialAgente {
  ClientId: string;
  ClientSecret: string;
  TokenEndpoint: string;
  TenantHost: string;
  IdentificadorEstacion: string;
}

/** Detecta y configura la aplicacion local, sin instalar software desde la web. */
@Injectable({ providedIn: 'root' })
export class AgenteImpresionLocalService {
  private static readonly localUrl = 'http://127.0.0.1:17431';

  constructor(
    private readonly http: HttpClient,
    private readonly storage: StorageService,
  ) {}

  async configurarSiEstaInstalado(): Promise<boolean> {
    const identificador = this.storage.getCurrentIP()?.trim();
    if (!identificador) return false;

    const estado = await this.obtenerEstado();
    if (!estado) return false;
    if (estado.Configurado
        && estado.QzDisponible
        && estado.IdentificadorEstacion?.toUpperCase()
          === identificador.toUpperCase()) {
      return true;
    }

    try {
      const response = await firstValueFrom(this.http.post<
        ApiResponse<CredencialAgente>
      >(`${environment.apiUrl}/agentes-impresion/vincular`, {
        IdentificadorEstacion: identificador,
        NombreEquipo: window.navigator.userAgent.substring(0, 150),
      }));
      if (!response.Success || !response.Data) return false;

      const configurado = await this.fetchConTimeout('/configurar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ApiUrl: environment.apiUrl,
          ...response.Data,
        }),
      });
      if (!configurado.ok) return false;
      const nuevoEstado = await configurado.json() as EstadoAgenteLocal;
      return nuevoEstado.Configurado && nuevoEstado.QzDisponible;
    } catch (error) {
      console.warn('No se pudo configurar el agente local de impresion.', error);
      return false;
    }
  }

  private async obtenerEstado(): Promise<EstadoAgenteLocal | null> {
    try {
      const response = await this.fetchConTimeout('/estado');
      return response.ok
        ? await response.json() as EstadoAgenteLocal
        : null;
    } catch {
      return null;
    }
  }

  private async fetchConTimeout(
    path: string,
    init?: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1_500);
    try {
      return await fetch(`${AgenteImpresionLocalService.localUrl}${path}`, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
