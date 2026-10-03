import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';
import {
  AeatConfiguration,
  ModoFiscalEspana,
  SaveAeatConfiguration,
} from 'src/app/models/aeat-configuration.models';
import { AeatConfigurationService } from 'src/app/services/aeat-configuration.service';
import { Notificar } from 'src/app/shared/notificaciones';

@Component({
  selector: 'app-aeat-configuration',
  templateUrl: './aeat-configuration.component.html',
  styleUrls: ['./aeat-configuration.component.scss'],
})
export class AeatConfigurationComponent implements OnInit {
  private static readonly MAX_CERTIFICATE_BYTES = 2 * 1024 * 1024;

  readonly modes = ModoFiscalEspana;
  configuration: AeatConfiguration | null = null;
  certificate: File | null = null;
  nif = '';
  installationNumber = '1';
  mode: ModoFiscalEspana = ModoFiscalEspana.VeriFactu;
  certificatePassword = '';
  requirementFrom = '';
  requirementTo = '';
  requirementReference = '';
  loading = false;
  saving = false;
  sendingRequirement = false;
  verifyingIntegrity = false;
  exportingArchive = false;

  constructor(
    private readonly service: AeatConfigurationService,
    private readonly dialogRef: MatDialogRef<AeatConfigurationComponent>,
  ) {}

  ngOnInit(): void {
    const today = this.formatDate(new Date());
    this.requirementFrom = today;
    this.requirementTo = today;
    this.load();
  }

  get statusLabel(): string {
    if (!this.configuration?.CertificadoConfigurado) {
      return 'Pendiente de configurar';
    }
    return this.configuration.CertificadoVigente
      ? `${this.configuration.ModoFiscalDescripcion} operativo`
      : 'Certificado vencido';
  }

  get isNoVeriFactu(): boolean {
    return this.mode === ModoFiscalEspana.NoVeriFactu;
  }

  get readyToSave(): boolean {
    return (
      this.nif.trim().length === 9 &&
      this.installationNumber.trim().length > 0 &&
      this.certificatePassword.length > 0 &&
      this.certificate !== null
    );
  }

  get readyToSendRequirement(): boolean {
    return (
      this.isNoVeriFactu &&
      !!this.requirementFrom &&
      !!this.requirementTo &&
      this.requirementFrom <= this.requirementTo &&
      this.requirementReference.trim().length > 0 &&
      this.requirementReference.trim().length <= 18
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
        'Selecciona el certificado electrónico en formato PFX o P12.',
        'warning',
      );
      return;
    }
    if (file.size > AeatConfigurationComponent.MAX_CERTIFICATE_BYTES) {
      Swal.fire(
        'Certificado demasiado grande',
        'El certificado no puede superar 2 MB.',
        'warning',
      );
      return;
    }
    this.certificate = file;
  }

  async save(): Promise<void> {
    if (!this.readyToSave || !this.certificate) {
      Swal.fire(
        'Revisa la configuración',
        'Indica la modalidad, el NIF, la instalación y selecciona el certificado con su contraseña.',
        'warning',
      );
      return;
    }

    const startsVeriFactu =
      this.mode === ModoFiscalEspana.VeriFactu &&
      this.configuration?.ModoFiscal !== ModoFiscalEspana.VeriFactu;
    if (startsVeriFactu) {
      const confirmation = await Swal.fire({
        title: '¿Activar VERI*FACTU?',
        text: 'Desde la primera remisión, esta modalidad deberá mantenerse hasta finalizar el año natural.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, activar',
        cancelButtonText: 'Revisar',
      });
      if (!confirmation.isConfirmed) {
        return;
      }
    }

    const request: SaveAeatConfiguration = {
      Nif: this.nif.trim().toUpperCase(),
      ModoFiscal: this.mode,
      NumeroInstalacion: this.installationNumber.trim(),
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
          this.certificatePassword = '';
          this.certificate = null;
          Notificar.exito(
            'Sistema fiscal AEAT configurado',
            response.Message,
          );
        },
        error: error =>
          this.showError(
            error,
            'No se pudo guardar la configuración fiscal AEAT.',
          ),
      });
  }

  sendRequirement(): void {
    if (!this.readyToSendRequirement) {
      Swal.fire(
        'Revisa el requerimiento',
        'Indica el periodo y la referencia comunicada por la AEAT (máximo 18 caracteres).',
        'warning',
      );
      return;
    }

    this.sendingRequirement = true;
    this.service
      .sendRequirement({
        Desde: this.requirementFrom,
        Hasta: this.requirementTo,
        ReferenciaRequerimiento: this.requirementReference.trim(),
      })
      .pipe(finalize(() => (this.sendingRequirement = false)))
      .subscribe({
        next: response =>
          Notificar.exito('Remisión a la AEAT completada', response.Message),
        error: error =>
          this.showError(error, 'No se pudieron remitir los registros a la AEAT.'),
      });
  }

  verifyIntegrity(): void {
    this.verifyingIntegrity = true;
    this.service
      .verifyIntegrity()
      .pipe(finalize(() => (this.verifyingIntegrity = false)))
      .subscribe({
        next: response =>
          Notificar.exito(
            'Libro fiscal íntegro',
            `${response.Data.RegistrosFacturacionVerificados} registros de facturación y ${response.Data.RegistrosEventoVerificados} eventos verificados.`,
          ),
        error: error =>
          this.showError(
            error,
            'No se pudo verificar la integridad del libro fiscal.',
          ),
      });
  }

  exportArchive(): void {
    if (!this.requirementFrom || !this.requirementTo || this.requirementFrom > this.requirementTo) {
      Swal.fire(
        'Revisa el periodo',
        'Indica un periodo válido para exportar el libro fiscal.',
        'warning',
      );
      return;
    }

    this.exportingArchive = true;
    this.service
      .exportArchive(this.requirementFrom, this.requirementTo)
      .pipe(finalize(() => (this.exportingArchive = false)))
      .subscribe({
        next: archive => {
          const url = URL.createObjectURL(archive);
          const link = document.createElement('a');
          link.href = url;
          link.download = `aeat-no-verifactu-${this.requirementFrom.replaceAll('-', '')}-${this.requirementTo.replaceAll('-', '')}.zip`;
          link.click();
          URL.revokeObjectURL(url);
          Notificar.exito(
            'Libro fiscal exportado',
            'La descarga incluye los XML firmados de facturación y eventos, junto con su manifiesto de integridad.',
          );
        },
        error: error =>
          this.showError(error, 'No se pudo exportar el libro fiscal.'),
      });
  }

  openResponsibleDeclaration(): void {
    const url = this.configuration?.DeclaracionResponsableUrl?.trim();
    if (!url) {
      Swal.fire(
        'Declaración pendiente de publicar',
        'La versión fiscal está identificada, pero el productor todavía debe firmar y publicar su declaración responsable antes de la puesta en producción.',
        'warning',
      );
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
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
          this.showError(error, 'No se pudo cargar la configuración fiscal AEAT.');
          this.close();
        },
      });
  }

  private applyConfiguration(configuration: AeatConfiguration): void {
    this.configuration = configuration;
    this.nif = configuration.Nif ?? '';
    this.installationNumber = configuration.NumeroInstalacion || '1';
    this.mode = configuration.ModoFiscal ?? ModoFiscalEspana.VeriFactu;
  }

  private showError(error: any, fallback: string): void {
    Swal.fire(
      'Sistema fiscal AEAT',
      error?.error?.Message || error?.error?.message || fallback,
      'error',
    );
  }

  private formatDate(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
