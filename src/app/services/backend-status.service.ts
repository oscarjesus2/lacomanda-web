import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Rastrea si el backend está alcanzable o no.
 * status === 0 en HttpErrorResponse → backend caído (timeout / sin red).
 * El interceptor llama markDown() / markUp() según corresponda.
 * Los componentes pueden suscribirse a isDown$ para reaccionar.
 */
@Injectable({ providedIn: 'root' })
export class BackendStatusService {
  private _isDown = new BehaviorSubject<boolean>(false);

  /** Observable que emite true cuando el backend no responde */
  readonly isDown$ = this._isDown.asObservable();

  get isDown(): boolean { return this._isDown.value; }

  /** Llamar cuando un request falla con status 0 (red / timeout) */
  markDown(): void {
    if (!this._isDown.value) {
      this._isDown.next(true);
    }
  }

  /** Llamar cuando cualquier request tiene respuesta (incluso error HTTP > 0) */
  markUp(): void {
    if (this._isDown.value) {
      this._isDown.next(false);
    }
  }
}
