import { ApplicationRef, Injectable, NgZone, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NavigationEnd, Router } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { Subject, fromEvent, interval, merge, race, timer } from 'rxjs';
import { auditTime, filter, first, takeUntil } from 'rxjs/operators';

const CHECK_INTERVAL_MS = 10 * 60 * 1000;
const MIN_CHECK_INTERVAL_MS = 60 * 1000;
const REGISTRATION_FALLBACK_MS = 30 * 1000;

/**
 * Mantiene la aplicación al día sin dejar tareas intensivas en segundo plano.
 * El navegador sigue siendo quien duerme y despierta el Service Worker; este
 * servicio únicamente solicita una comprobación ocasional de `ngsw.json`.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService implements OnDestroy {
  private readonly stop$ = new Subject<void>();
  private started = false;
  private checking = false;
  private lastCheckAt = 0;
  private notifiedVersionHash: string | null = null;

  constructor(
    private readonly appRef: ApplicationRef,
    private readonly router: Router,
    private readonly swUpdate: SwUpdate,
    private readonly snackBar: MatSnackBar,
    private readonly zone: NgZone,
  ) {}

  start(): void {
    if (this.started || !this.swUpdate.isEnabled) return;

    this.started = true;
    this.listenForVersions();

    const appStable$ = this.appRef.isStable.pipe(
      filter(isStable => isStable),
      first(),
    );

    // Normalmente empieza al estabilizar Angular. El límite evita que una
    // conexión recurrente (SignalR, temporizadores, etc.) lo retrase siempre.
    race(appStable$, timer(REGISTRATION_FALLBACK_MS))
      .pipe(first(), takeUntil(this.stop$))
      .subscribe(() => this.startLightweightChecks());
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.stop$.next();
  }

  ngOnDestroy(): void {
    this.stop();
    this.stop$.complete();
  }

  private listenForVersions(): void {
    this.swUpdate.versionUpdates
      .pipe(takeUntil(this.stop$))
      .subscribe(event => {
        if (event.type === 'VERSION_READY') {
          this.notifyReadyVersion(event);
          return;
        }

        if (event.type === 'VERSION_INSTALLATION_FAILED') {
          console.error('No se pudo instalar la nueva versión del frontend.', event.error);
        }
      });

    this.swUpdate.unrecoverable
      .pipe(takeUntil(this.stop$))
      .subscribe(event => {
        console.error('La versión local del frontend no se puede recuperar.', event.reason);
        this.zone.run(() => {
          const ref = this.snackBar.open(
            'La aplicación necesita recargarse para continuar.',
            'Recargar',
          );
          ref.onAction().pipe(first()).subscribe(() => window.location.reload());
        });
      });
  }

  private startLightweightChecks(): void {
    void this.checkNow(true);

    this.zone.runOutsideAngular(() => {
      interval(CHECK_INTERVAL_MS)
        .pipe(takeUntil(this.stop$))
        .subscribe(() => void this.checkNow());

      const visible$ = fromEvent(document, 'visibilitychange').pipe(
        filter(() => document.visibilityState === 'visible'),
      );
      const navigation$ = this.router.events.pipe(
        filter(event => event instanceof NavigationEnd),
      );

      merge(
        fromEvent(window, 'focus'),
        fromEvent(window, 'online'),
        visible$,
        navigation$,
      )
        .pipe(auditTime(2000), takeUntil(this.stop$))
        .subscribe(() => void this.checkNow());
    });
  }

  private async checkNow(force = false): Promise<void> {
    if (
      !this.started ||
      !this.swUpdate.isEnabled ||
      this.checking ||
      document.visibilityState === 'hidden' ||
      !navigator.onLine
    ) {
      return;
    }

    const now = Date.now();
    if (!force && now - this.lastCheckAt < MIN_CHECK_INTERVAL_MS) return;

    this.checking = true;
    this.lastCheckAt = now;

    try {
      await this.swUpdate.checkForUpdate();
    } catch (error) {
      // Una pérdida puntual de red no debe molestar al usuario ni romper la app.
      console.warn('No se pudo comprobar si existe una nueva versión.', error);
    } finally {
      this.checking = false;
    }
  }

  private notifyReadyVersion(event: VersionReadyEvent): void {
    if (this.notifiedVersionHash === event.latestVersion.hash) return;
    this.notifiedVersionHash = event.latestVersion.hash;

    this.zone.run(() => {
      const ref = this.snackBar.open(
        'Hay una nueva versión de LaComanda disponible.',
        'Actualizar',
      );

      // Una recarga completa conserva la coherencia entre HTML, JavaScript y
      // recursos cacheados. No activamos parcialmente versiones distintas.
      ref.onAction().pipe(first()).subscribe(() => window.location.reload());
    });
  }
}
