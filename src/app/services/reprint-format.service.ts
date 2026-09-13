import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';
import { TenantTextCatalogService } from './localization/tenant-text-catalog.service';

export type ReprintFormat = 1 | 2; // 1: papel de 80 mm; 2: A4

@Injectable({ providedIn: 'root' })
export class ReprintFormatService {
  constructor(private readonly texts: TenantTextCatalogService) {}

  async choose(): Promise<ReprintFormat | null> {
    const result = await Swal.fire({
      title: this.texts.get('preferredFormat'),
      text: this.texts.get('chooseOption'),
      icon: 'question',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: `${this.texts.get('ticket')} 80 mm`,
      denyButtonText: 'A4',
      cancelButtonText: this.texts.get('cancel'),
    });

    return result.isConfirmed ? 1 : result.isDenied ? 2 : null;
  }
}
