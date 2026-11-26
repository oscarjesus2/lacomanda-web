import { Injectable } from '@angular/core';
import { asapScheduler, auditTime, BehaviorSubject, distinctUntilChanged } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HeaderService {
  private readonly headerVisibleSubject = new BehaviorSubject(true);
  // La página anterior y la nueva pueden pedir estados opuestos al salir y entrar.
  // El shell aplica el último después del ciclo que inicializa la página.
  readonly headerVisible$ = this.headerVisibleSubject.pipe(
    auditTime(0, asapScheduler),
    distinctUntilChanged(),
  );

  hideHeader() {
    this.headerVisibleSubject.next(false);
  }

  showHeader() {
    this.headerVisibleSubject.next(true);
  }
}
