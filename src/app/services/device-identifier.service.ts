import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class DeviceIdentifierService {
  private readonly cookieName = 'clientUUID';

  constructor(
    private readonly cookie: CookieService,
    private readonly storage: StorageService,
  ) {}

  getIdentifier(): string {
    return (this.cookie.get(this.cookieName)
      || this.storage.getCurrentIP()
      || '').trim();
  }

  generateIdentifier(): string {
    try {
      const uuid = (globalThis.crypto as Crypto & { randomUUID?: () => string })
        ?.randomUUID?.();
      if (uuid) return uuid;
    } catch { /* El navegador no ofrece randomUUID. */ }

    const s4 = () => Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .slice(1);
    return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
  }

  saveIdentifier(identifier: string): void {
    const value = identifier.trim();
    const expiration = new Date();
    expiration.setFullYear(expiration.getFullYear() + 10);
    this.cookie.set(this.cookieName, value, expiration, '/');

    const session = this.storage.getCurrentSession();
    if (session) {
      session.Ip = value;
      this.storage.setCurrentSession(session);
    }
  }

  deleteIdentifier(): void {
    this.cookie.delete(this.cookieName, '/');
    this.cookie.delete(this.cookieName);

    const session = this.storage.getCurrentSession();
    if (session) {
      session.Ip = '';
      this.storage.setCurrentSession(session);
    }
  }
}
