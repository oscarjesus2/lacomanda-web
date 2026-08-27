import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';
import {
  ActualizarConfiguracionPagoCuentaOnline,
  ConfiguracionPagoCuentaOnline,
} from 'src/app/models/pago-cuenta-online.models';
import { PagoCuentaOnlineService } from 'src/app/services/pago-cuenta-online.service';
import { Notificar } from 'src/app/shared/notificaciones';

@Component({
  selector: 'app-pago-cuenta-online-configuration',
  templateUrl: './pago-cuenta-online-configuration.component.html',
})
export class PagoCuentaOnlineConfigurationComponent implements OnInit {
  configuration: ConfiguracionPagoCuentaOnline | null = null;
  active = false;
  moneiAccountId = '';
  culqiPublicKey = '';
  culqiSecretKey = '';
  loading = false;
  saving = false;
  copied = false;

  constructor(
    private readonly service: PagoCuentaOnlineService,
    private readonly dialogRef: MatDialogRef<PagoCuentaOnlineConfigurationComponent>,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get isSpain(): boolean {
    return this.configuration?.PaisISO2?.toUpperCase() === 'ES';
  }

  get providerName(): string {
    return this.isSpain ? 'MONEI Connect' : 'Culqi';
  }

  get readyToSave(): boolean {
    if (!this.active) {
      return true;
    }

    if (this.isSpain) {
      return this.moneiAccountId.trim().length > 0;
    }

    return this.culqiPublicKey.trim().length > 0
      && (this.culqiSecretKey.length > 0
        || !!this.configuration?.CredencialPrivadaConfigurada);
  }

  save(): void {
    if (!this.readyToSave) {
      Swal.fire(
        'Revisa la configuración',
        this.isSpain
          ? 'Indica el identificador de la cuenta MONEI del restaurante.'
          : 'Indica las claves pública y privada de Culqi del restaurante.',
        'warning',
      );
      return;
    }

    const request: ActualizarConfiguracionPagoCuentaOnline = {
      Activa: this.active,
      MoneiAccountId: this.isSpain ? this.moneiAccountId.trim() : undefined,
      CulqiPublicKey: this.isSpain ? undefined : this.culqiPublicKey.trim(),
      // Vacía significa conservar la clave que ya está cifrada en el backend.
      CulqiSecretKey: this.isSpain || !this.culqiSecretKey
        ? undefined
        : this.culqiSecretKey,
    };

    this.saving = true;
    this.service.actualizar(request)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: response => {
          this.apply(response.Data);
          this.culqiSecretKey = '';
          Notificar.exito(
            'Cobro móvil configurado',
            this.active
              ? 'Los clientes ya podrán pagar su cuenta desde el QR de su espacio.'
              : 'El cobro móvil quedó desactivado para este restaurante.',
          );
        },
        error: error => this.showError(
          error,
          'No se pudo guardar la configuración del cobro móvil.',
        ),
      });
  }

  async copyWebhook(): Promise<void> {
    const url = this.configuration?.UrlWebhook;
    if (!url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      this.copied = true;
      window.setTimeout(() => (this.copied = false), 2200);
    } catch {
      Swal.fire(
        'URL del webhook',
        'No se pudo copiar automáticamente. Selecciona y copia la dirección mostrada.',
        'info',
      );
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  private load(): void {
    this.loading = true;
    this.service.obtener()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: response => this.apply(response.Data),
        error: error => {
          this.showError(
            error,
            'No se pudo cargar la configuración del cobro móvil.',
          );
          this.close();
        },
      });
  }

  private apply(configuration: ConfiguracionPagoCuentaOnline): void {
    this.configuration = configuration;
    this.active = configuration.Activa;
    this.moneiAccountId = configuration.MoneiAccountId ?? '';
    this.culqiPublicKey = configuration.CulqiPublicKey ?? '';
  }

  private showError(error: any, fallback: string): void {
    Swal.fire(
      'Cobro móvil de la cuenta',
      error?.error?.Message || error?.error?.message || fallback,
      'error',
    );
  }
}
