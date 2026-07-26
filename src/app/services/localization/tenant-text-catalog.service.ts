import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { StorageService } from '../storage.service';

export type TenantTextKey =
  | 'orderAttendant'
  | 'changeOrderAttendant'
  | 'selectOrderAttendant'
  | 'orderAttendantRequired'
  | 'onlyAdminCanChangeOrderAttendant'
  | 'couldNotChangeOrderAttendant'
  | 'unexpectedOrderAttendantChangeError'
  | 'language'
  | 'useTenantLanguage'
  | 'cultureChangeError';

type TextCatalog = Record<TenantTextKey, string>;

const CATALOGS: Record<string, TextCatalog> = {
  en: {
    orderAttendant: 'Waiter',
    changeOrderAttendant: 'Change waiter',
    selectOrderAttendant: 'Select a waiter',
    orderAttendantRequired: 'You must select a waiter.',
    onlyAdminCanChangeOrderAttendant:
      'Only an administrator can change the waiter.',
    couldNotChangeOrderAttendant: 'The waiter could not be changed.',
    unexpectedOrderAttendantChangeError:
      'An error occurred while changing the waiter.',
    language: 'Language',
    useTenantLanguage: 'Use business language',
    cultureChangeError: 'The language preference could not be changed.',
  },
  'es-ES': {
    orderAttendant: 'Camarero',
    changeOrderAttendant: 'Cambiar camarero',
    selectOrderAttendant: 'Seleccione un camarero',
    orderAttendantRequired: 'Debe seleccionar un camarero.',
    onlyAdminCanChangeOrderAttendant:
      'Solo el administrador puede cambiar el camarero.',
    couldNotChangeOrderAttendant: 'No se pudo cambiar el camarero.',
    unexpectedOrderAttendantChangeError:
      'Ocurrió un error al cambiar el camarero.',
    language: 'Idioma',
    useTenantLanguage: 'Usar idioma del negocio',
    cultureChangeError: 'No se pudo cambiar la preferencia de idioma.',
  },
  'es-PE': {
    orderAttendant: 'Mozo',
    changeOrderAttendant: 'Cambiar mozo',
    selectOrderAttendant: 'Seleccione un mozo',
    orderAttendantRequired: 'Debe seleccionar un mozo.',
    onlyAdminCanChangeOrderAttendant:
      'Solo el administrador puede cambiar el mozo.',
    couldNotChangeOrderAttendant: 'No se pudo cambiar el mozo.',
    unexpectedOrderAttendantChangeError:
      'Ocurrió un error al cambiar el mozo.',
    language: 'Idioma',
    useTenantLanguage: 'Usar idioma del negocio',
    cultureChangeError: 'No se pudo cambiar la preferencia de idioma.',
  },
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

  get(key: TenantTextKey): string {
    return this.getCatalog(this.culture)[key] ?? CATALOGS.en[key];
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
