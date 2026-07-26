import { Pipe, PipeTransform } from '@angular/core';

import {
  TenantTextCatalogService,
  TenantTextKey,
} from '../services/localization/tenant-text-catalog.service';

@Pipe({
  name: 'tenantText',
  pure: false,
})
export class TenantTextPipe implements PipeTransform {
  constructor(private catalog: TenantTextCatalogService) {}

  transform(key: TenantTextKey): string {
    return this.catalog.get(key);
  }
}
