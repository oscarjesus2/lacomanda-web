import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Configuracion, ConfiguracionInicial } from '../models/configuracion.models';
import { ApiResponse } from '../interfaces/apirResponse.interface';

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private base = environment.apiUrl + '/config';

  private _config$ = new BehaviorSubject<Configuracion | null>(null);
  /** Config cargada una sola vez al iniciar sesión. */
  readonly config$ = this._config$.asObservable();

  constructor(private http: HttpClient) {}

  /** Carga la config del servidor y la almacena en caché. */
  get(): Observable<Configuracion> {
    return this.http.get<ApiResponse<Configuracion>>(`${this.base}`)
      .pipe(
        map(r => r.Data),
        tap(cfg => this._config$.next(cfg))
      );
  }

  /** Valor sincrónico de la config (puede ser null antes de cargar). */
  get snapshot(): Configuracion | null {
    return this._config$.value;
  }

  /** Actualiza la caché manualmente (p.ej. tras guardar). */
  setConfig(cfg: Configuracion): void {
    this._config$.next(cfg);
  }

  /** Símbolo de moneda usando la config por defecto. */
  getSimboloMoneda(idMoneda: string): string {
    const cfg = this._config$.value;
    if (!cfg) return '-';
    if (idMoneda === cfg.IdMoneda) return cfg.SimboloMoneda || '-';
    return cfg.SimboloMoneda || '-';
  }

  save(model: Configuracion): Observable<Configuracion> {
    return this.http.put<ApiResponse<Configuracion>>(`${this.base}`, model)
      .pipe(
        map(r => r.Data),
        tap(cfg => this._config$.next(cfg))
      );
  }

  saveInitial(model: ConfiguracionInicial): Observable<Configuracion> {
    return this.http.put<ApiResponse<Configuracion>>(`${this.base}/inicial`, model)
      .pipe(
        map(r => r.Data),
        tap(cfg => this._config$.next(cfg))
      );
  }

  obtenerLogo(): Observable<Blob> {
    return this.http.get(`${this.base}/logo`, { responseType: 'blob' });
  }

  guardarLogo(logo: File): Observable<ApiResponse<unknown>> {
    const formData = new FormData();
    formData.append('logo', logo, logo.name);
    return this.http.put<ApiResponse<unknown>>(`${this.base}/logo`, formData)
      .pipe(tap(() => this.actualizarIndicadorLogo(true)));
  }

  eliminarLogo(): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/logo`)
      .pipe(tap(() => this.actualizarIndicadorLogo(false)));
  }

  private actualizarIndicadorLogo(tieneLogo: boolean): void {
    const actual = this._config$.value;
    if (actual) this._config$.next({ ...actual, TieneLogo: tieneLogo });
  }
}
