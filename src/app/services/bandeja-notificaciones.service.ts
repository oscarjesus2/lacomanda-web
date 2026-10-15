import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, Subscription, catchError, exhaustMap, firstValueFrom, from, map, of, timer } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { NotificacionDetalle, NotificacionResumen, TipoNotificacion } from '../models/notificacion.models';
import { StorageService } from './storage.service';
import { CONSULTA_CESIA_EN_SEGUNDO_PLANO } from '../interceptor/background-request.context';

@Injectable({ providedIn: 'root' })
export class BandejaNotificacionesService {
  private readonly basePath = `${environment.apiUrl}/notificaciones`;
  private readonly items = new BehaviorSubject<NotificacionResumen[]>([]);
  readonly notificaciones$ = this.items.asObservable();
  readonly pendientes$ = this.notificaciones$.pipe(map(items => items.filter(n => !n.LeidaUtc).length));
  private readonly nuevas = new Subject<NotificacionResumen[]>();
  readonly nuevas$ = this.nuevas.asObservable();
  private readonly fallo = new BehaviorSubject(false);
  readonly error$ = this.fallo.asObservable();
  private polling?: Subscription;
  private sesion = '';
  private version = 0;
  private revisionLectura = 0;
  private inicializada = false;
  private cargando?: Promise<void>;

  constructor(private readonly http: HttpClient, private readonly storage: StorageService) {}

  iniciar(): void {
    const identidad = this.identidad();
    if (identidad && identidad === this.sesion && this.polling) return;
    this.detener();
    if (!identidad) return;
    this.sesion = identidad;
    this.polling = timer(0, 60_000).pipe(exhaustMap(() => from(this.actualizar()).pipe(catchError(() => of(undefined))))).subscribe();
  }

  detener(): void {
    this.version++;
    this.polling?.unsubscribe();
    this.polling = undefined;
    this.cargando = undefined;
    this.sesion = '';
    this.inicializada = false;
    this.items.next([]);
    this.fallo.next(false);
  }

  actualizar(): Promise<void> {
    if (this.cargando) return this.cargando;
    const version = this.version;
    const tarea = this.cargar(version);
    this.cargando = tarea;
    void tarea.finally(() => { if (this.cargando === tarea) this.cargando = undefined; }).catch(() => undefined);
    return tarea;
  }

  private async cargar(version: number): Promise<void> {
    const revisionLectura = this.revisionLectura;
    const identidad = this.identidad();
    if (!identidad) { this.detener(); return; }
    const options = { context: new HttpContext().set(CONSULTA_CESIA_EN_SEGUNDO_PLANO, true) };
    try {
      let reconciliada = true;
      try { await firstValueFrom(this.http.post(`${this.basePath}/sincronizar`, {}, options)); }
      catch { reconciliada = false; } // Un origen indisponible no oculta los avisos ya recibidos.
      const response = await firstValueFrom(this.http.get<ApiResponse<NotificacionResumen[]>>(this.basePath, options));
      if (this.version !== version || this.identidad() !== identidad || revisionLectura !== this.revisionLectura) return;
      if (!response.Success) throw new Error('Incomplete notification response');
      const anteriores = new Set(this.items.value.map(n => n.Id));
      const recibidas = (response.Data ?? []).filter(n => !n.LeidaUtc && !anteriores.has(n.Id));
      this.items.next(response.Data ?? []);
      this.fallo.next(!reconciliada);
      if (this.inicializada && recibidas.length) this.nuevas.next(recibidas);
      this.inicializada = true;
    } catch (error) {
      if (this.version === version && this.identidad() === identidad) this.fallo.next(true);
      throw error;
    }
  }

  async tipos(): Promise<TipoNotificacion[]> {
    return (await firstValueFrom(this.http.get<ApiResponse<TipoNotificacion[]>>(`${this.basePath}/tipos`))).Data;
  }

  async suscribir(codigo: string, recibir: boolean): Promise<void> {
    await firstValueFrom(this.http.put(`${this.basePath}/tipos/${encodeURIComponent(codigo)}`, { Recibir: recibir }));
  }

  async detalle(id: string): Promise<NotificacionDetalle> {
    return (await firstValueFrom(this.http.get<ApiResponse<NotificacionDetalle>>(`${this.basePath}/${encodeURIComponent(id)}`))).Data;
  }

  async marcarLeida(id: string): Promise<void> {
    const identidad = this.identidad();
    const version = this.version;
    await firstValueFrom(this.http.put(`${this.basePath}/${encodeURIComponent(id)}/leida`, {}));
    if (this.version !== version || this.identidad() !== identidad) return;
    this.revisionLectura++; // Una consulta anterior no puede devolverla a pendientes.
    // Solo moverla después de confirmar el guardado; conservar exactamente tres leídas.
    const lista = this.items.value.map(n => n.Id === id && !n.LeidaUtc ? { ...n, LeidaUtc: new Date().toISOString() } : n);
    const leidas = lista.filter(n => n.LeidaUtc).sort((a, b) => b.LeidaUtc!.localeCompare(a.LeidaUtc!)).slice(0, 3);
    this.items.next([...lista.filter(n => !n.LeidaUtc), ...leidas]);
  }

  private identidad(): string {
    const session = this.storage.getCurrentSession();
    const user = this.storage.getCurrentUser();
    return this.storage.isAuthenticated() && session?.TenantID && user?.IdUsuario ? `${session.TenantID}:${user.IdUsuario}` : '';
  }
}
