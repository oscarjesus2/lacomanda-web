import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';
import {
  SaveSunatConfiguration,
  SunatConfiguration,
} from 'src/app/models/sunat-configuration.models';
import { SunatConfigurationService } from 'src/app/services/sunat-configuration.service';
import { Notificar } from 'src/app/shared/notificaciones';

@Component({
  selector: 'app-sunat-configuration',
  templateUrl: './sunat-configuration.component.html',
})
export class SunatConfigurationComponent implements OnInit {
  private static readonly MAX_CERTIFICATE_BYTES = 2 * 1024 * 1024;

  configuration: SunatConfiguration | null = null;
  certificate: File | null = null;
  ubigeo = '';
  solUser = '';
  solPassword = '';
  certificatePassword = '';
  loading = false;
  saving = false;

  constructor(
    private readonly service: SunatConfigurationService,
    private readonly dialogRef: MatDialogRef<SunatConfigurationComponent>,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get statusLabel(): string {
    if (!this.configuration?.CertificadoConfigurado) {
      return 'Pendiente de configurar';
    }
    return this.configuration.CertificadoVigente
      ? 'Certificado vigente'
      : 'Certificado vencido';
  }

  get readyToSave(): boolean {
    return (
      /^\d{6}$/.test(this.ubigeo.trim()) &&
      this.solUser.trim().length > 0 &&
      this.solPassword.length > 0 &&
      this.certificatePassword.length > 0 &&
      this.certificate !== null
    );
  }

  selectCertificate(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) {
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'pfx' && extension !== 'p12') {
      Swal.fire(
        'Certificado no válido',
        'Selecciona el certificado digital en formato PFX o P12.',
        'warning',
      );
      return;
    }
    if (file.size > SunatConfigurationComponent.MAX_CERTIFICATE_BYTES) {
      Swal.fire(
        'Certificado demasiado grande',
        'El certificado digital no puede superar 2 MB.',
        'warning',
      );
      return;
    }
    this.certificate = file;
  }

  save(): void {
    if (!this.readyToSave || !this.certificate) {
      Swal.fire(
        'Revisa la configuración',
        'Completa el ubigeo, las credenciales SOL y selecciona el certificado digital con su contraseña.',
        'warning',
      );
      return;
    }

    const request: SaveSunatConfiguration = {
      Ubigeo: this.ubigeo.trim(),
      UsuarioSol: this.solUser.trim(),
      ClaveSol: this.solPassword,
      ClaveCertificado: this.certificatePassword,
      Certificado: this.certificate,
    };

    this.saving = true;
    this.service
      .save(request)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: response => {
          this.applyConfiguration(response.Data);
          this.solPassword = '';
          this.certificatePassword = '';
          this.certificate = null;
          Notificar.exito(
            'Facturación electrónica configurada',
            'Las credenciales y el certificado quedaron guardados de forma segura.',
          );
        },
        error: error =>
          this.showError(
            error,
            'No se pudo guardar la configuración de facturación electrónica.',
          ),
      });
  }

  close(): void {
    this.dialogRef.close();
  }

  private load(): void {
    this.loading = true;
    this.service
      .get()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: response => this.applyConfiguration(response.Data),
        error: error => {
          this.showError(
            error,
            'No se pudo cargar la configuración de facturación electrónica.',
          );
          this.close();
        },
      });
  }

  private applyConfiguration(configuration: SunatConfiguration): void {
    this.configuration = configuration;
    this.ubigeo = configuration.Ubigeo ?? '';
    this.solUser = configuration.UsuarioSol ?? '';
  }

  private showError(error: any, fallback: string): void {
    Swal.fire(
      'Facturación electrónica',
      error?.error?.Message || error?.error?.message || fallback,
      'error',
    );
  }
}
