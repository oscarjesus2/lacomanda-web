import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, fromEvent, merge, Subject, Subscription, take, timer } from 'rxjs';
import { isJwtActive } from '../services/auth/token.utils';
import { StorageService } from '../services/storage.service';
import { CajaOfflineApiService, ContextoCaja, URL_CAJA_LOCAL } from './caja-offline-api.service';

const ESTACION_PREPARADA = 'offline.estacionPreparada';
const INSTALACION_PENDIENTE = 'offline.instalacionPendiente';

@Injectable({ providedIn: 'root' })
export class CajaOfflineSincronizacionService implements OnDestroy {
  private vigilancia?: Subscription;
  private esperaInstalacion?: Subscription;
  private enCurso = false;
  private readonly revision = new BehaviorSubject(false);
  private readonly instalacionPreparada = new Subject<void>();
  readonly requiereRevision$ = this.revision.asObservable();
  readonly instalacionPreparada$ = this.instalacionPreparada.asObservable();

  constructor(private readonly api: CajaOfflineApiService, private readonly storage: StorageService,
    private readonly zone: NgZone) {}

  recordar(contexto: ContextoCaja): void {
    this.marcarPreparada(this.clave(contexto.tenantId, contexto.identificadorEstacion));
  }

  esperarInstalacion(tenantId: string, identificadorEstacion: string): void {
    localStorage.setItem(INSTALACION_PENDIENTE, this.clave(tenantId, identificadorEstacion));
    this.esperaInstalacion?.unsubscribe();
    this.esperaInstalacion = undefined;
    this.iniciar();
  }

  iniciar(): void {
    const pendiente = localStorage.getItem(INSTALACION_PENDIENTE);
    if (!pendiente && !localStorage.getItem(ESTACION_PREPARADA)) return;
    this.zone.runOutsideAngular(() => {
      if (!this.vigilancia) {
        this.vigilancia = merge(timer(15000, 5 * 60 * 1000), fromEvent(window, 'online')).subscribe(() => void this.actualizar());
      }
      if (pendiente && !this.esperaInstalacion) {
        // Durante los primeros cinco minutos detecta pronto el arranque. Luego basta el sondeo habitual.
        this.esperaInstalacion = timer(5000, 10000).pipe(take(30)).subscribe(() => void this.actualizar());
      }
    });
  }

  async actualizar(): Promise<void> {
    const sesion = this.storage.getCurrentSession();
    const clave = sesion?.TenantID && sesion.Ip ? this.clave(sesion.TenantID, sesion.Ip) : null;
    const instalando = !!clave && localStorage.getItem(INSTALACION_PENDIENTE) === clave;
    if (this.enCurso || !clave || !isJwtActive(sesion.Token)
        || (!instalando && localStorage.getItem(ESTACION_PREPARADA) !== clave)) {
      if (!this.enCurso) this.avisarRevision(false);
      return;
    }
    this.enCurso = true;
    let confirmando = false;
    try {
      const estado = await this.api.estado(URL_CAJA_LOCAL);
      const identidad = estado.identidad ?? estado.contexto;
      if (!identidad || this.clave(identidad.tenantId, identidad.identificadorEstacion) !== clave) return;
      if (estado.contexto && this.clave(estado.contexto.tenantId, estado.contexto.identificadorEstacion) !== clave) return;
      if (!estado.contexto && !instalando) return;
      const sesionVigente = () => sesion === this.storage.getCurrentSession() && isJwtActive(sesion.Token)
        && this.clave(sesion.TenantID, sesion.Ip) === clave;
      if (!await this.api.comprobarNube() || !sesionVigente()) return;
      confirmando = true;
      await this.api.gestionar(URL_CAJA_LOCAL, 'regularizar', sesion.Token);
      confirmando = false;
      this.avisarRevision(false);
      if (!sesionVigente()) return;
      await this.api.gestionar(URL_CAJA_LOCAL, 'sincronizar', sesion.Token);
      if (instalando && sesionVigente() && localStorage.getItem(INSTALACION_PENDIENTE) === clave) {
        await this.api.prepararImpresionLocal();
        this.marcarPreparada(clave);
      }
    } catch (error) {
      if (confirmando && error instanceof HttpErrorResponse && [400, 409, 422].includes(error.status)) {
        this.avisarRevision(true);
      }
    } finally {
      this.enCurso = false;
    }
  }

  ngOnDestroy(): void {
    this.vigilancia?.unsubscribe();
    this.esperaInstalacion?.unsubscribe();
  }

  private marcarPreparada(clave: string): void {
    localStorage.setItem(ESTACION_PREPARADA, clave);
    if (localStorage.getItem(INSTALACION_PENDIENTE) === clave) {
      localStorage.removeItem(INSTALACION_PENDIENTE);
      this.esperaInstalacion?.unsubscribe();
      this.esperaInstalacion = undefined;
      this.zone.run(() => this.instalacionPreparada.next());
    }
    this.iniciar();
  }

  private avisarRevision(pendiente: boolean): void {
    if (this.revision.value !== pendiente) this.zone.run(() => this.revision.next(pendiente));
  }

  private clave(tenant: string, estacion: string): string {
    return JSON.stringify([tenant.trim().toLowerCase(), estacion]);
  }
}
