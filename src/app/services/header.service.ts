import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HeaderService {
  private headerVisibleSubject = new BehaviorSubject<boolean>(true);
  headerVisible$ = this.headerVisibleSubject.asObservable();

  hideHeader() {
    this.headerVisibleSubject.next(false);
  }

  showHeader() {
    this.headerVisibleSubject.next(true);
  }
}
