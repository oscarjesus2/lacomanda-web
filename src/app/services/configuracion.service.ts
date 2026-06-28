import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Configuracion } from '../models/configuracion.models';
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
}
