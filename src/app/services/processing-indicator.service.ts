import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ProcessingIndicatorOptions {
  title: string;
  message: string;
  hint?: string;
  icon?: string;
}

export interface ProcessingIndicatorHandle {
  update(options: Partial<ProcessingIndicatorOptions>): void;
  close(): void;
}

export type ProcessingIndicatorState = ProcessingIndicatorOptions;

@Injectable({ providedIn: 'root' })
export class ProcessingIndicatorService {
  private readonly activeOperations = new Map<symbol, ProcessingIndicatorState>();
  private readonly stateSubject =
    new BehaviorSubject<ProcessingIndicatorState | null>(null);

  readonly state$: Observable<ProcessingIndicatorState | null> =
    this.stateSubject.asObservable();

  begin(options: ProcessingIndicatorOptions): ProcessingIndicatorHandle {
    const operationId = Symbol('processing-operation');
    let closed = false;

    this.activeOperations.set(operationId, this.normalize(options));
    this.publishLatest();

    return {
      update: changes => {
        if (closed) {
          return;
        }

        const current = this.activeOperations.get(operationId);
        if (!current) {
          return;
        }

        this.activeOperations.set(
          operationId,
          this.normalize({ ...current, ...changes }),
        );
        this.publishLatest();
      },
      close: () => {
        if (closed) {
          return;
        }

        closed = true;
        this.activeOperations.delete(operationId);
        this.publishLatest();
      },
    };
  }

  private normalize(
    options: ProcessingIndicatorOptions,
  ): ProcessingIndicatorState {
    return {
      title: options.title || 'Procesando',
      message: options.message || 'Estamos preparando la información.',
      hint: options.hint,
      icon: options.icon || 'hourglass_top',
    };
  }

  private publishLatest(): void {
    const active = Array.from(this.activeOperations.values());
    this.stateSubject.next(active.length ? active[active.length - 1] : null);
  }
}
