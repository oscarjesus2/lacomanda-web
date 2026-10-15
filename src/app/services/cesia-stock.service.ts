import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, Subscription, catchError, exhaustMap, map, of, switchMap, timer } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CARACTERISTICAS_LICENCIA } from '../constants/caracteristicas-licencia';
import { NivelUsuarioEnum } from '../enums/enum';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { AlertaStockCesia, ConsultaAlertasStockCesia } from '../models/cesia-stock.models';
import { LicenciaTenantService } from './licencia-tenant.service';
import { StorageService } from './storage.service';
import { CONSULTA_CESIA_EN_SEGUNDO_PLANO } from '../interceptor/background-request.context';

export interface EstadoCesiaStock {
  habilitado: boolean;
  error: boolean;
  consulta: ConsultaAlertasStockCesia | null;
}

@Injectable({ providedIn: 'root' })
export class CesiaStockService {
  private readonly estadoSubject = new BehaviorSubject<EstadoCesiaStock>({ habilitado: false, error: false, consulta: null });
  readonly estado$ = this.estadoSubject.asObservable();
  readonly habilitado$ = this.estado$.pipe(map(e => e.habilitado));
  readonly alertas$ = this.estado$.pipe(map(e => e.consulta?.Alertas ?? []));
  private readonly nuevasSubject = new Subject<AlertaStockCesia[]>();
  readonly nuevas$ = this.nuevasSubject.asObservable();
  private polling?: Subscription;
  private sesion = '';
  private readonly avisadas = new Map<string, { gravedad: number; ultimaPresencia: number }>();

  constructor(
    private readonly http: HttpClient,
    private readonly storage: StorageService,
    private readonly licencia: LicenciaTenantService,
  ) {}

  iniciar(): void {
    const sesion = this.identidad();
    if (sesion && sesion === this.sesion && this.polling) return;
    this.detener();
    if (!sesion) return;
    this.sesion = sesion;
    this.polling = timer(0, 60_000).pipe(
      exhaustMap(() => {
        if (this.identidad() !== sesion) {
          this.detener();
          return of(null);
        }
        return this.licencia.tieneCaracteristica([
          CARACTERISTICAS_LICENCIA.AlmacenKardex,
          CARACTERISTICAS_LICENCIA.SoporteCesiaIa,
        ]).pipe(
          switchMap(habilitado => {
            this.estadoSubject.next({ ...this.estadoSubject.value, habilitado });
            if (!habilitado) {
              this.estadoSubject.next({ habilitado: false, error: false, consulta: null });
              return of(null);
            }
            return this.http.get<ApiResponse<ConsultaAlertasStockCesia>>(
              `${environment.apiUrl}/cesia/alertas-stock`,
              { context: new HttpContext().set(CONSULTA_CESIA_EN_SEGUNDO_PLANO, true) },
            ).pipe(map(r => {
              if (!r.Success || !r.Data) throw new Error('Respuesta de Cesia incompleta.');
              return r.Data;
            }));
          }),
          catchError((error: HttpErrorResponse) => {
            if (error.status === 401 || error.status === 403 || error.status === 402) {
              this.detener();
            } else {
              this.estadoSubject.next({ ...this.estadoSubject.value, error: true });
            }
            return of(null);
          }),
        );
      }),
    ).subscribe(consulta => {
      if (!consulta || this.sesion !== sesion || this.identidad() !== sesion) return;
      this.estadoSubject.next({ habilitado: true, error: false, consulta });
      const ahora = Date.now();
      const activas = new Set(consulta.Alertas.map(a => a.Clave));
      for (const [clave, aviso] of this.avisadas) {
        if (!activas.has(clave) && ahora - aviso.ultimaPresencia >= 10 * 60_000) this.avisadas.delete(clave);
      }
      const nuevas: AlertaStockCesia[] = [];
      for (const alerta of consulta.Alertas) {
        const gravedad = alerta.Tipo === 'SIN_STOCK' ? 3 : alerta.Tipo === 'RIESGO_AGOTAMIENTO' ? 2 : 1;
        const anterior = this.avisadas.get(alerta.Clave);
        if (!anterior || gravedad > anterior.gravedad) nuevas.push(alerta);
        this.avisadas.set(alerta.Clave, { gravedad: Math.max(gravedad, anterior?.gravedad ?? 0), ultimaPresencia: ahora });
      }
      if (nuevas.length) this.nuevasSubject.next(nuevas);
    });
  }

  detener(): void {
    this.polling?.unsubscribe();
    this.polling = undefined;
    this.sesion = '';
    this.avisadas.clear();
    this.estadoSubject.next({ habilitado: false, error: false, consulta: null });
  }

  private identidad(): string {
    const sesion = this.storage.getCurrentSession();
    const usuario = this.storage.getCurrentUser();
    if (!this.storage.isAuthenticated() || !sesion?.TenantID || !usuario?.IdUsuario
      || (usuario.IdNivel !== NivelUsuarioEnum.Administrador && usuario.IdNivel !== NivelUsuarioEnum.Gerente)) return '';
    return `${sesion.TenantID}:${usuario.IdUsuario}:${usuario.IdNivel}`;
  }
}
