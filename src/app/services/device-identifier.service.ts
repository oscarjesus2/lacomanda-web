import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class DeviceIdentifierService {
  private readonly cookieName = 'clientUUID';
  private readonly confirmedStationLinkPrefix = 'lc_station_link_confirmed';

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
    const identifier = this.getIdentifier();
    this.clearConfirmedStationLink(identifier);
    this.cookie.delete(this.cookieName, '/');
    this.cookie.delete(this.cookieName);

    const session = this.storage.getCurrentSession();
    if (session) {
      session.Ip = '';
      this.storage.setCurrentSession(session);
    }
  }

  hasConfirmedStationLink(identifier: string): boolean {
    const key = this.confirmedStationLinkKey(identifier);
    return !!key && localStorage.getItem(key) === 'true';
  }

  markStationLinkConfirmed(identifier: string): void {
    const key = this.confirmedStationLinkKey(identifier);
    if (key) localStorage.setItem(key, 'true');
  }

  clearConfirmedStationLink(identifier: string): void {
    const key = this.confirmedStationLinkKey(identifier);
    if (key) localStorage.removeItem(key);
  }

  private confirmedStationLinkKey(identifier: string): string {
    const tenant = this.storage.getCurrentSession()?.TenantID
      ?.trim()
      .toLowerCase();
    const device = identifier?.trim().toLowerCase();
    return tenant && device
      ? `${this.confirmedStationLinkPrefix}:${tenant}:${device}`
      : '';
  }
}
