import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { StorageService } from '../storage.service';
import {
  EN_TEXTS,
  TenantTextKey,
  TenantTextParams,
} from './tenant-texts.en';
import {
  ES_ES_OVERRIDES,
  ES_PE_OVERRIDES,
  ES_TEXTS,
} from './tenant-texts.es';

export type { TenantTextKey, TenantTextParams } from './tenant-texts.en';

type TextCatalog = Record<TenantTextKey, string>;

const CATALOGS: Record<string, TextCatalog> = {
  en: { ...EN_TEXTS },
  'es-ES': { ...ES_TEXTS, ...ES_ES_OVERRIDES },
  'es-PE': { ...ES_TEXTS, ...ES_PE_OVERRIDES },
};

@Injectable({ providedIn: 'root' })
export class TenantTextCatalogService {
  private readonly cultureSubject: BehaviorSubject<string>;
  readonly culture$: Observable<string>;

  constructor(private storageService: StorageService) {
    this.cultureSubject = new BehaviorSubject<string>(
      this.normalizeCulture(
        this.storageService.getCurrentSession()?.Cultura
          ?? navigator.language
          ?? 'en',
      ),
    );
    this.culture$ = this.cultureSubject.asObservable();
  }

  get culture(): string {
    return this.cultureSubject.value;
  }

  setCulture(culture: string | null | undefined): void {
    const normalized = this.normalizeCulture(culture);
    if (normalized !== this.cultureSubject.value) {
      this.cultureSubject.next(normalized);
    }
  }

  get(key: TenantTextKey, params?: TenantTextParams): string {
    const template =
      this.getCatalog(this.culture)[key] ?? CATALOGS.en[key];

    if (!params) {
      return template;
    }

    return Object.entries(params).reduce(
      (text, [name, value]) =>
        text.replace(
          new RegExp(`{{${name}}}`, 'g'),
          value === null || value === undefined ? '' : String(value),
        ),
      template,
    );
  }

  private getCatalog(culture: string): TextCatalog {
    return CATALOGS[culture] ?? CATALOGS.en;
  }

  private normalizeCulture(culture: string | null | undefined): string {
    const value = culture?.trim().toLowerCase();
    if (value === 'es-pe' || value?.startsWith('es-pe-')) {
      return 'es-PE';
    }

    if (value === 'es-es' || value?.startsWith('es-es-')) {
      return 'es-ES';
    }

    return value?.startsWith('en') ? 'en' : 'en';
  }
}
