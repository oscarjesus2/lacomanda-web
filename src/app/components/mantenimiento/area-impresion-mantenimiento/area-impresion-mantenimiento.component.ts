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
  ValidacionAreaImpresionDispositivo,
} from 'src/app/models/area-impresion.models';
import { AreaImpresionService } from 'src/app/services/area-impresion.service';
import { DeviceIdentifierService } from 'src/app/services/device-identifier.service';
import { QzTrayV224Service } from 'src/app/services/qz-tray-v224.service';
import { TenantTextKey } from 'src/app/services/localization/tenant-texts.en';
import { Notificar } from 'src/app/shared/notificaciones';

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
  ) {}

  ngOnInit(): void {
    this.identificadorDispositivo = this.obtenerIdentificadorDispositivo();
    void this.cargar();
  }

  async cargar(): Promise<void> {
    this.spinner.show();
    try {
      const [areas, validaciones] = await Promise.all([
        firstValueFrom(this.areaSrv.listar()),
        firstValueFrom(this.areaSrv.obtenerValidacionesDispositivo(
          this.identificadorDispositivo,
        )),
      ]);
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
      const resultado = await this.qzTray.listarImpresoras();
      this.impresorasInstaladas = resultado.Impresoras;
      this.impresoraPredeterminada = resultado.Predeterminada;
      this.qzDisponible = true;
      if (mostrarResultado) {
        await Swal.fire(
          'Equipo comprobado',
          `QZ encontró ${resultado.Impresoras.length} impresora(s) en este equipo.`,
          'success',
        );
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
    await this.refrescarImpresoras(false);
    if (this.qzDisponible !== true) {
      await Swal.fire(
        'No se puede validar',
        'Abra QZ Tray y vuelva a comprobar este equipo antes de guardar.',
        'warning',
      );
      return;
    }

    this.guardandoEquipo = true;
    try {
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
        await Swal.fire(
          'Equipo validado',
          'Todas las impresoras configuradas existen en este equipo.',
          'success',
        );
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
    if (!this.impresoraExiste(area)) return;

    this.probandoAreaId = area.IdAreaImpresion;
    try {
      await this.qzTray.probarImpresora(area.NombreImpresora);
      await Swal.fire(
        'Prueba enviada',
        `Se envió una prueba a la impresora de ${area.Descripcion}.`,
        'success',
      );
    } catch (error) {
      console.error('Falló la prueba de impresión:', error);
      await Swal.fire(
        'No se pudo imprimir',
        'Revise que la impresora esté encendida, conectada y sin errores.',
        'error',
      );
    } finally {
      this.probandoAreaId = null;
    }
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
        await Swal.fire(
          'Correcto',
          esActualizacion ? 'Área actualizada' : 'Área creada',
          'success',
        );
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
