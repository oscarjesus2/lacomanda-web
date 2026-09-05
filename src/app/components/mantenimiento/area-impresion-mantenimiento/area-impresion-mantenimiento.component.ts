import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { NgForm } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { NgxSpinnerService } from 'ngx-spinner';

import {
  AreaImpresion,
  EstadoPruebaImpresionArea,
  TrabajoImpresionEstadoEnum,
  ValidacionAreaImpresionDispositivo,
} from 'src/app/models/area-impresion.models';
import { AreaImpresionService } from 'src/app/services/area-impresion.service';
import { DeviceIdentifierService } from 'src/app/services/device-identifier.service';
import { QzTrayV224Service } from 'src/app/services/qz-tray-v224.service';
import { TenantTextKey } from 'src/app/services/localization/tenant-texts.en';
import { Notificar } from 'src/app/shared/notificaciones';
import { DeviceCapabilitiesService } from 'src/app/services/device-capabilities.service';
import { Estacion } from 'src/app/models/estacion.models';
import { EstacionService } from 'src/app/services/estacion.service';
import { DispositivoTipoEnum } from 'src/app/models/device.models';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';

interface AreaImpresionEquipo extends AreaImpresion {
  NombreImpresoraGuardada: string;
  FechaUltimaValidacionUtc: string | null;
}

@Component({
  selector: 'app-area-impresion-mantenimiento',
  templateUrl: './area-impresion-mantenimiento.component.html',
  styleUrls: ['./area-impresion-mantenimiento.component.css']
})
export class AreaImpresionMantenimientoComponent implements OnInit {
  @ViewChild('areaForm') areaForm!: NgForm;
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) this.filtered.paginator = value;
  }

  showForm = false;
  areas: AreaImpresionEquipo[] = [];
  filtered = new MatTableDataSource<AreaImpresionEquipo>([]);
  filtro = '';
  a: AreaImpresion = { IdAreaImpresion: 0, Descripcion: '', NombreImpresora: '' };

  impresorasInstaladas: string[] = [];
  impresoraPredeterminada: string | null = null;
  qzDisponible: boolean | null = null;
  detectandoImpresoras = false;
  guardandoEquipo = false;
  probandoAreaId: number | null = null;
  identificadorDispositivo = '';
  estacionActual: Estacion | null = null;

  displayedColumns: string[] = [
    'descripcion',
    'nombreImpresora',
    'estadoEquipo',
    'actions',
  ];

  constructor(
    private dialogRef: MatDialogRef<AreaImpresionMantenimientoComponent>,
    private areaSrv: AreaImpresionService,
    private deviceIdentifier: DeviceIdentifierService,
    private qzTray: QzTrayV224Service,
    private spinner: NgxSpinnerService,
    private deviceCapabilities: DeviceCapabilitiesService,
    private estacionService: EstacionService,
    private textCatalog: TenantTextCatalogService,
  ) {}

  get agenteRemotoRecomendado(): boolean {
    return this.deviceCapabilities.requiresRemotePrintAgent();
  }

  get qzConectadoSinImpresoras(): boolean {
    return this.qzDisponible === true
      && this.impresorasInstaladas.length === 0;
  }

  get textoEstadoQz(): TenantTextKey {
    if (this.qzDisponible === false) return 'qzUnavailable';
    if (this.qzConectadoSinImpresoras) return 'qzConnectedNoPrinters';
    return this.qzDisponible === true ? 'qzConnected' : 'checkingQz';
  }

  get iconoEstadoQz(): string {
    if (this.qzDisponible === false) return 'error';
    if (this.qzConectadoSinImpresoras) return 'warning';
    return this.qzDisponible === true ? 'check_circle' : 'hourglass_empty';
  }

  ngOnInit(): void {
    this.identificadorDispositivo = this.obtenerIdentificadorDispositivo();
    void this.cargar();
  }

  async cargar(): Promise<void> {
    this.spinner.show();
    try {
      const [areas, validaciones, estaciones] = await Promise.all([
        firstValueFrom(this.areaSrv.listar()),
        firstValueFrom(this.areaSrv.obtenerValidacionesDispositivo(
          this.identificadorDispositivo,
        )),
        firstValueFrom(this.estacionService.getAll()),
      ]);
      this.estacionActual = (estaciones.Data ?? []).find(estacion =>
        estacion.IdentificadorUnico?.trim().toLowerCase()
          === this.identificadorDispositivo.trim().toLowerCase()
      ) ?? null;
      this.areas = this.combinarValidaciones(areas ?? [], validaciones ?? []);
      this.applyFilter();
      await this.refrescarImpresoras(false);
    } catch (error) {
      console.error('No se pudo cargar la configuración de impresión:', error);
      await Swal.fire('Error', 'No se pudo cargar las áreas y su configuración.', 'error');
    } finally {
      this.spinner.hide();
    }
  }

  async refrescarImpresoras(mostrarResultado = false): Promise<void> {
    this.detectandoImpresoras = true;
    try {
      if (!this.deviceCapabilities.supportsLocalQz()) {
        this.impresorasInstaladas = [];
        this.impresoraPredeterminada = null;
        this.qzDisponible = false;
        return;
      }

      const resultado = await this.qzTray.listarImpresoras();
      this.impresorasInstaladas = resultado.Impresoras;
      this.impresoraPredeterminada = resultado.Predeterminada;
      this.qzDisponible = true;
      if (mostrarResultado) {
        Notificar.exito('Equipo comprobado',
          `QZ encontró ${resultado.Impresoras.length} impresora(s) en este equipo.`);
      }
    } catch (error) {
      console.error('No se pudo consultar QZ Tray:', error);
      this.impresorasInstaladas = [];
      this.impresoraPredeterminada = null;
      this.qzDisponible = false;
      if (mostrarResultado) {
        await Swal.fire(
          'QZ no está disponible',
          'Abra QZ Tray y compruebe que LaComanda esté autorizada para validar las impresoras.',
          'warning',
        );
      }
    } finally {
      this.detectandoImpresoras = false;
    }
  }

  applyFilter(): void {
    const filtro = (this.filtro || '').trim().toLowerCase();
    this.filtered.data = this.areas.filter(area =>
      !filtro
      || (area.Descripcion || '').toLowerCase().includes(filtro)
      || (area.NombreImpresora || '').toLowerCase().includes(filtro),
    );
  }

  impresoraExiste(area: AreaImpresionEquipo): boolean {
    const nombre = area.NombreImpresora?.trim();
    if (!nombre || this.qzDisponible !== true) return false;
    return this.impresorasInstaladas.some(impresora => impresora === nombre);
  }

  estadoEquipo(area: AreaImpresionEquipo): TenantTextKey {
    if (this.qzDisponible === false) return 'qzUnavailable';
    if (!this.impresoraExiste(area)) return 'printerNotFoundOnDevice';
    if (area.NombreImpresora !== area.NombreImpresoraGuardada) {
      return 'printerReadyToSave';
    }
    return 'printerValidatedOnDevice';
  }

  claseEstadoEquipo(area: AreaImpresionEquipo): string {
    if (this.qzDisponible === false) return 'device-printer-status--warning';
    if (!this.impresoraExiste(area)) return 'device-printer-status--error';
    if (area.NombreImpresora !== area.NombreImpresoraGuardada) {
      return 'device-printer-status--pending';
    }
    return 'device-printer-status--success';
  }

  async validarEsteEquipo(): Promise<void> {
    if (this.guardandoEquipo || this.detectandoImpresoras) return;
    this.guardandoEquipo = true;
    try {
      if (this.areas.length === 0) {
        await Swal.fire(
          this.textCatalog.get('noPrintAreasToValidateTitle'),
          this.textCatalog.get('noPrintAreasToValidateMessage'),
          'info',
        );
        return;
      }

      await this.refrescarImpresoras(false);
      if (this.qzDisponible !== true) {
        await Swal.fire(
          'No se puede validar localmente',
          this.agenteRemotoRecomendado
            ? 'Este dispositivo no puede ejecutar QZ Tray. Puedes usar “Probar” para enviar una impresión al agente instalado en una PC Windows.'
            : 'Abra QZ Tray o use “Probar” para enviar una impresión mediante el agente de otra PC.',
          'warning',
        );
        return;
      }

      const encontradas = this.areas.filter(area => this.impresoraExiste(area));
      const respuesta = await firstValueFrom(
        this.areaSrv.guardarValidacionesDispositivo(
          this.identificadorDispositivo,
          {
            IdentificadorDispositivo: this.identificadorDispositivo,
            ImpresorasValidadas: encontradas.map(area => ({
                IdAreaImpresion: area.IdAreaImpresion,
                NombreImpresoraValidada: area.NombreImpresora,
              })),
          },
        ),
      );
      if (!respuesta.Success) {
        throw new Error(respuesta.Message || 'No se pudo guardar la configuración.');
      }

      const guardadas = respuesta.Data ?? [];
      const porArea = new Map(guardadas.map(item => [item.IdAreaImpresion, item]));
      this.areas.forEach(area => {
        const validacion = porArea.get(area.IdAreaImpresion);
        area.NombreImpresoraGuardada = validacion?.NombreImpresoraValidada ?? '';
        area.FechaUltimaValidacionUtc = validacion?.FechaUltimaValidacionUtc ?? null;
      });
      const noEncontradas = this.areas.filter(area => !this.impresoraExiste(area));
      if (noEncontradas.length) {
        await Swal.fire(
          'Validación incompleta',
          `Se validaron ${encontradas.length} impresora(s). No se encontraron: `
            + `${noEncontradas.map(area => `${area.Descripcion} (${area.NombreImpresora})`).join(', ')}. `
            + 'El nombre debe existir exactamente igual en QZ/Windows.',
          'warning',
        );
      } else {
        Notificar.exito('Equipo validado',
          'Todas las impresoras configuradas existen en este equipo.');
      }
    } catch (error: any) {
      await Swal.fire(
        'Error',
        error?.error?.Message || error?.message || 'No se pudo guardar la configuración.',
        'error',
      );
    } finally {
      this.guardandoEquipo = false;
    }
  }

  async probarImpresora(area: AreaImpresionEquipo): Promise<void> {
    if (!this.puedeProbar(area) || this.probandoAreaId !== null) return;

    this.probandoAreaId = area.IdAreaImpresion;
    try {
      if (this.qzDisponible === true) {
        await this.qzTray.probarImpresora(area.NombreImpresora, {
          Estacion: this.estacionActual?.Descripcion
            || 'DISPOSITIVO SIN VINCULAR',
          IdentificadorDispositivo: this.estacionActual
            ? undefined
            : this.identificadorDispositivo,
          TipoDispositivo: this.nombreTipoDispositivo(
            this.estacionActual?.TipoDispositivo
              ?? this.deviceCapabilities.getDeviceType(),
          ),
          Area: area.Descripcion,
        });
        Notificar.exito(
          'Prueba impresa',
          `QZ confirmó el envío a ${area.NombreImpresora}.`,
        );
        return;
      }

      await this.probarMedianteAgente(area);
    } catch (error: any) {
      console.error('Falló la prueba de impresión:', error);
      const message = error?.error?.Message
        || error?.message
        || 'Revise que la impresora esté encendida, conectada y sin errores.';
      if (/ningún agente|ningun agente|agente de impresión no respondió/i.test(message)) {
        await Notificar.advertencia(
          'El agente no respondió',
          `${message} Instala o inicia LaComanda Print Agent y QZ Tray en una PC Windows de caja o mozo.`,
        );
      } else {
        await Notificar.error('No se pudo imprimir', message);
      }
    } finally {
      this.probandoAreaId = null;
    }
  }

  puedeProbar(area: AreaImpresionEquipo): boolean {
    return this.qzDisponible === false || this.impresoraExiste(area);
  }

  nuevo(): void {
    this.resetForm();
    this.showForm = true;
  }

  onEdit(row: AreaImpresion): void {
    this.a = { ...row };
    this.showForm = true;
  }

  onDelete(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'No podrás revertir esto.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then(resultado => {
      if (!resultado.isConfirmed) return;
      this.areaSrv.eliminar(id).subscribe({
        next: async respuesta => {
          if (!respuesta.Success) {
            await Swal.fire('Error', respuesta.Message || 'No se pudo eliminar', 'error');
            return;
          }
          await this.cargar();
          Notificar.exito('Área eliminada');
        },
        error: () => Swal.fire('Error', 'No se pudo eliminar', 'error'),
      });
    });
  }

  onSubmit(): void {
    if (this.areaForm.invalid) {
      Object.values(this.areaForm.controls).forEach(control => {
        control.markAsTouched();
        control.markAsDirty();
      });
      return;
    }

    const esActualizacion = !!this.a.IdAreaImpresion;
    const operacion = esActualizacion
      ? this.areaSrv.actualizar(this.a)
      : this.areaSrv.crear(this.a);
    operacion.subscribe({
      next: async respuesta => {
        if (!respuesta.Success) {
          await Swal.fire('Error', respuesta.Message || 'Operación no realizada', 'error');
          return;
        }
        this.showForm = false;
        await this.cargar();
        Notificar.exito('Correcto',
          esActualizacion ? 'Área actualizada' : 'Área creada');
      },
      error: () => Swal.fire('Error', 'No se pudo guardar', 'error'),
    });
  }

  cancelar(): void {
    this.resetForm();
    this.showForm = false;
  }

  resetForm(): void {
    this.a = { IdAreaImpresion: 0, Descripcion: '', NombreImpresora: '' };
  }

  salir(): void {
    this.dialogRef.close();
  }

  private obtenerIdentificadorDispositivo(): string {
    const existente = this.deviceIdentifier.getIdentifier();
    if (existente) return existente;

    const nuevo = this.deviceIdentifier.generateIdentifier();
    this.deviceIdentifier.saveIdentifier(nuevo);
    return nuevo;
  }

  private async probarMedianteAgente(
    area: AreaImpresionEquipo,
  ): Promise<void> {
    const respuesta = await firstValueFrom(
      this.areaSrv.solicitarPruebaRemota(
        area.IdAreaImpresion,
        this.identificadorDispositivo,
        this.deviceCapabilities.getDeviceType(),
      ),
    );
    if (!respuesta.Success || !respuesta.Data) {
      throw new Error(
        respuesta.Message || 'No se pudo enviar la prueba al agente.',
      );
    }

    const estado = await this.esperarConfirmacionAgente(
      respuesta.Data.IdTrabajoImpresion,
      respuesta.Data.FechaExpiracionUtc,
    );
    if (estado.Estado === TrabajoImpresionEstadoEnum.COMPLETADO) {
      Notificar.exito(
        'Prueba confirmada por el agente',
        `${area.Descripcion} se imprimió en ${area.NombreImpresora}.`,
      );
      return;
    }

    throw new Error(
      estado.UltimoError
        || 'El agente de impresión no respondió antes de vencer la prueba.',
    );
  }

  private async esperarConfirmacionAgente(
    idTrabajoImpresion: number,
    fechaExpiracionUtc: string,
  ): Promise<EstadoPruebaImpresionArea> {
    const limite = Math.max(
      Date.parse(fechaExpiracionUtc) + 1500,
      Date.now() + 5000,
    );
    do {
      await new Promise(resolve => setTimeout(resolve, 750));
      const respuesta = await firstValueFrom(
        this.areaSrv.consultarEstadoPrueba(idTrabajoImpresion),
      );
      if (!respuesta.Success || !respuesta.Data) {
        throw new Error(
          respuesta.Message || 'No se pudo consultar la prueba.',
        );
      }
      if (respuesta.Data.Estado === TrabajoImpresionEstadoEnum.COMPLETADO
          || respuesta.Data.Estado === TrabajoImpresionEstadoEnum.FALLIDO) {
        return respuesta.Data;
      }
    } while (Date.now() <= limite);

    return {
      IdTrabajoImpresion: idTrabajoImpresion,
      Estado: TrabajoImpresionEstadoEnum.FALLIDO,
      UltimoError: 'Ningún agente de impresión atendió la prueba a tiempo.',
    };
  }

  private nombreTipoDispositivo(tipo: DispositivoTipoEnum): string {
    return this.textCatalog.get(
      this.deviceCapabilities.getDeviceTypeTextKey(tipo),
    );
  }

  private combinarValidaciones(
    areas: AreaImpresion[],
    validaciones: ValidacionAreaImpresionDispositivo[],
  ): AreaImpresionEquipo[] {
    const porArea = new Map(
      validaciones.map(validacion => [validacion.IdAreaImpresion, validacion]),
    );
    return areas.map(area => {
      const validacion = porArea.get(area.IdAreaImpresion);
      return {
        ...area,
        NombreImpresoraGuardada: validacion?.NombreImpresoraValidada ?? '',
        FechaUltimaValidacionUtc: validacion?.FechaUltimaValidacionUtc ?? null,
      };
    });
  }
}
