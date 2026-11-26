import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription, exhaustMap, fromEvent, merge, timer } from 'rxjs';
import { BackendStatusService } from '../services/backend-status.service';

export function observarConexionNube(comprobar: () => Promise<boolean>, inicioMs = 0) {
  return merge(timer(inicioMs, 60000), fromEvent(window, 'online'), fromEvent(window, 'offline'))
    .pipe(exhaustMap(comprobar));
}

/** Determina cuándo se puede ofrecer la contingencia, sin activarla por sí sola. */
@Injectable({ providedIn: 'root' })
export class OfflineDisponibilidadService {
  private static readonly esperaMs = 5 * 60 * 1000;
  private readonly disponible = new BehaviorSubject(false);
  private espera?: Subscription;
  private vigilancia?: Subscription;

  readonly ofrecerAutomaticamente$ = this.disponible.asObservable();

  constructor(private readonly backend: BackendStatusService) {
    this.backend.isDown$.subscribe(sinConexion => {
      this.espera?.unsubscribe();
      this.espera = undefined;
      this.disponible.next(false);
      if (sinConexion) {
        const transcurrido = Math.max(0, Date.now() - (this.backend.downSince ?? Date.now()));
        const restante = Math.max(0, OfflineDisponibilidadService.esperaMs - transcurrido);
        this.espera = timer(restante).subscribe(() => {
          // El estado puede haber cambiado al mismo tiempo que venció el plazo.
          if (this.backend.isDown) this.disponible.next(true);
        });
      }
    });
  }

  vigilar(comprobar: () => Promise<boolean>): void {
    if (this.vigilancia) return;
    this.vigilancia = observarConexionNube(comprobar)
      .subscribe(disponible => disponible ? this.backend.markUp() : this.backend.markDown());
  }

  detenerVigilancia(): void {
    this.vigilancia?.unsubscribe();
    this.vigilancia = undefined;
  }

  /** Se puede solicitar también en la pantalla inicial, antes de detectar el estado. */
  get permiteSolicitudManual(): boolean {
    // La activación debe comprobar por separado el estado de la nube y de caja.
    return true;
  }
}
