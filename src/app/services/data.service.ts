import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private variableToUpdate = new BehaviorSubject<string>('');
  currentVariable = this.variableToUpdate.asObservable();

  constructor() { }

  updateVariable_TituloHeader(newValue: string) {
    this.variableToUpdate.next(newValue);
  }
}
