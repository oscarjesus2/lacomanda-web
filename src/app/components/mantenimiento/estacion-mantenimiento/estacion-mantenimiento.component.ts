import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { Estacion } from 'src/app/models/estacion.models';
import { CajaDto } from 'src/app/models/caja.models';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import { EstacionTipoEnum } from 'src/app/enums/enum';
import { EstacionService } from 'src/app/services/estacion.service';
import { CajaService } from 'src/app/services/caja.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';
import { DeviceIdentifierService } from 'src/app/services/device-identifier.service';
import { EstacionSessionRealtimeService } from 'src/app/services/estacion-session-realtime.service';

@Component({
  selector: 'app-estacion-mantenimiento',
  templateUrl: './estacion-mantenimiento.component.html',
  styleUrls: ['./estacion-mantenimiento.component.css']
})
export class EstacionMantenimientoComponent implements OnInit {
  @ViewChild('estacionForm') estacionForm: NgForm;
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) this.filteredEstaciones.paginator = value;
  }

  estacion: Estacion = new Estacion();
  estaciones: Estacion[] = [];
  filteredEstaciones = new MatTableDataSource<Estacion>([]);
  filtro = '';
  showForm = false;
  guardando = false;
  identificadorPendiente = '';

  listCajas: CajaDto[] = [];
  tipos: ReadonlyArray<{ value: EstacionTipoEnum; label: string }> = [];
  displayedColumns: string[] = ['descripcion', 'identificadorUnico', 'caja', 'tipo', 'actions'];
  cajaMap: Record<number, string> = {};
  tipoMap: Record<number, string> = {};

  constructor(
    private readonly dialogRef: MatDialogRef<EstacionMantenimientoComponent>,
    private readonly estacionService: EstacionService,
    private readonly cajaService: CajaService,
    private readonly spinner: NgxSpinnerService,
    private readonly textCatalog: TenantTextCatalogService,
    private readonly deviceIdentifier: DeviceIdentifierService,
    private readonly realtime: EstacionSessionRealtimeService,
  ) {}

  ngOnInit(): void {
    this.inicializarTipos();
    this.cargarEstaciones();
    this.cargarCajas();
  }

  get esEsteDispositivo(): boolean {
    const actual = this.deviceIdentifier.getIdentifier();
    return !!actual && this.sonIguales(actual, this.estacion.IdentificadorUnico);
  }

  get seVincularaEsteDispositivo(): boolean {
    return !!this.identificadorPendiente;
  }

  get textoVinculacion(): string {
    if (this.seVincularaEsteDispositivo) {
      return 'Al guardar, este dispositivo quedará vinculado a la estación.';
    }
    if (this.esEsteDispositivo) {
      return 'Este es el dispositivo actualmente vinculado a la estación.';
    }
    if (this.estacion.IdentificadorUnico) {
      return 'La estación está vinculada a otro dispositivo.';
    }
    return 'La estación todavía no tiene un dispositivo vinculado.';
  }

  get textoAccionDispositivo(): string {
    return this.estacion.IdentificadorUnico && !this.esEsteDispositivo
      ? 'Reemplazar por este dispositivo'
      : 'Usar este dispositivo';
  }

  cargarEstaciones(): void {
    this.spinner.show();
    this.estacionService.getAll()
      .pipe(finalize(() => this.spinner.hide()))
      .subscribe({
        next: resp => {
          if (!resp.Success) {
            Swal.fire('Error', resp.Message || 'Error al cargar estaciones', 'error');
            return;
          }
          this.estaciones = resp.Data ?? [];
          this.filteredEstaciones.data = this.estaciones;
        },
        error: () => Swal.fire('Error', 'No se pudieron cargar las estaciones', 'error'),
      });
  }

  cargarCajas(): void {
    this.cajaService.getAllCaja(false).subscribe({
      next: resp => {
        if (!resp.Success) {
          Swal.fire('Error', resp.Message || 'No se pudieron cargar las cajas', 'error');
          return;
        }
        this.listCajas = resp.Data ?? [];
        this.cajaMap = this.listCajas.reduce((acc, caja) => {
          acc[caja.IdCaja] = caja.Descripcion;
          return acc;
        }, {} as Record<number, string>);
      },
      error: () => Swal.fire('Error', 'No se pudieron cargar las cajas', 'error'),
    });
  }

  nuevo(): void {
    this.resetForm();
    this.showForm = true;
  }

  applyFilter(): void {
    const value = this.filtro.trim().toLowerCase();
    this.filteredEstaciones.data = this.estaciones.filter(estacion =>
      (estacion.Descripcion ?? '').toLowerCase().includes(value) ||
      (this.estadoDispositivo(estacion)).toLowerCase().includes(value)
    );
    this.filteredEstaciones.paginator?.firstPage();
  }

  estadoDispositivo(estacion: Estacion): string {
    if (!estacion.IdentificadorUnico) return 'Sin dispositivo';
    return this.sonIguales(
      estacion.IdentificadorUnico,
      this.deviceIdentifier.getIdentifier(),
    ) ? 'Este dispositivo' : 'Otro dispositivo';
  }

  iconoDispositivo(estacion: Estacion): string {
    if (!estacion.IdentificadorUnico) return 'devices_other';
    return this.estadoDispositivo(estacion) === 'Este dispositivo'
      ? 'check_circle'
      : 'devices';
  }

  async usarEsteDispositivo(): Promise<void> {
    const identificador = this.deviceIdentifier.getIdentifier()
      || this.identificadorPendiente
      || this.deviceIdentifier.generateIdentifier();

    const estacionDeEsteDispositivo = this.estaciones.find(item =>
      item.IdEstacion !== this.estacion.IdEstacion &&
      this.sonIguales(item.IdentificadorUnico, identificador)
    );
    const reemplazaOtroDispositivo = !!this.estacion.IdentificadorUnico &&
      !this.sonIguales(this.estacion.IdentificadorUnico, identificador);

    const advertencias: string[] = [];
    if (reemplazaOtroDispositivo) {
      advertencias.push(
        `La estación ${this.estacion.Descripcion || ''} ya está vinculada a otro equipo. ` +
        'Ese equipo cerrará su sesión y dejará de operar como esta estación.'
      );
    }
    if (estacionDeEsteDispositivo) {
      advertencias.push(
        `Este dispositivo está configurado como ${estacionDeEsteDispositivo.Descripcion}. ` +
        'Esa estación quedará sin dispositivo asignado.'
      );
    }
    advertencias.push(
      `Este dispositivo quedará asociado a ${this.estacion.Descripcion || 'la estación'} cuando guardes.`
    );

    const result = await Swal.fire({
      title: reemplazaOtroDispositivo || estacionDeEsteDispositivo
        ? 'Confirmar cambio de dispositivo'
        : 'Configurar este dispositivo',
      html: advertencias.map(texto => `<p>${this.escapeHtml(texto)}</p>`).join(''),
      icon: reemplazaOtroDispositivo || estacionDeEsteDispositivo ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, usar este dispositivo',
      cancelButtonText: 'Cancelar',
      focusCancel: reemplazaOtroDispositivo,
    });

    if (result.isConfirmed) this.identificadorPendiente = identificador;
  }

  onSubmit(): void {
    if (this.estacionForm.invalid) {
      Object.values(this.estacionForm.controls).forEach(control => {
        control.markAsTouched();
        control.markAsDirty();
      });
      return;
    }

    this.guardando = true;
    this.spinner.show();
    const request = this.estacion.IdEstacion
      ? this.estacionService.update(this.estacion)
      : this.estacionService.create(this.estacion);

    request.subscribe({
      next: resp => this.procesarEstacionGuardada(resp),
      error: error => this.finalizarConError(
        error?.error?.Message || 'No se pudo guardar la estación.'
      ),
    });
  }

  onEdit(row: Estacion): void {
    this.estacion = Object.assign(new Estacion(), {
      ...row,
      IdEstacion: Number(row.IdEstacion),
      IdCaja: Number(row.IdCaja),
      Tipo: Number(row.Tipo) as EstacionTipoEnum,
      IdentificadorUnico: row.IdentificadorUnico ?? '',
    });
    this.identificadorPendiente = '';
    this.showForm = true;
  }

  onDelete(id: number): void {
    Swal.fire({
      title: '¿Eliminar estación?',
      text: 'Esta acción no se puede revertir.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then(result => {
      if (!result.isConfirmed) return;
      this.estacionService.delete(id).subscribe({
        next: resp => {
          if (!resp.Success) {
            Swal.fire('Error', resp.Message || 'No se pudo eliminar la estación.', 'error');
            return;
          }
          this.cargarEstaciones();
          Swal.fire('Estación eliminada', '', 'success');
        },
        error: () => Swal.fire('Error', 'No se pudo eliminar la estación.', 'error'),
      });
    });
  }

  resetForm(): void {
    this.estacion = Object.assign(new Estacion(), { IdentificadorUnico: '' });
    this.identificadorPendiente = '';
  }

  cancelar(): void {
    this.resetForm();
    this.showForm = false;
  }

  salir(): void {
    this.dialogRef.close();
  }

  private procesarEstacionGuardada(resp: ApiResponse<Estacion>): void {
    if (!resp.Success || !resp.Data) {
      this.finalizarConError(resp.Message || 'No se pudo guardar la estación.');
      return;
    }

    const guardada = resp.Data;
    if (!this.identificadorPendiente) {
      this.finalizarGuardado(
        this.estacion.IdEstacion ? 'Estación actualizada' : 'Estación creada'
      );
      return;
    }

    this.estacionService.linkDevice(
      Number(guardada.IdEstacion),
      this.identificadorPendiente,
    ).subscribe({
      next: vinculacion => {
        if (!vinculacion.Success) {
          this.finalizarConError(vinculacion.Message || 'No se pudo vincular el dispositivo.');
          return;
        }
        this.deviceIdentifier.saveIdentifier(this.identificadorPendiente);
        this.realtime.restart();
        this.finalizarGuardado('Estación y dispositivo configurados');
      },
      error: error => this.finalizarConError(
        error?.error?.Message || 'La estación se guardó, pero no se pudo vincular el dispositivo.'
      ),
    });
  }

  private finalizarGuardado(mensaje: string): void {
    this.guardando = false;
    this.spinner.hide();
    this.showForm = false;
    this.resetForm();
    this.cargarEstaciones();
    Swal.fire(mensaje, '', 'success');
  }

  private finalizarConError(mensaje: string): void {
    this.guardando = false;
    this.spinner.hide();
    Swal.fire('Error', mensaje, 'error');
  }

  private sonIguales(a?: string, b?: string): boolean {
    return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>'\"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    })[char] ?? char);
  }

  private inicializarTipos(): void {
    const mozo = this.textCatalog.get('orderAttendant');
    this.tipos = [
      { value: EstacionTipoEnum.ADMINISTRADOR, label: 'Administrador' },
      { value: EstacionTipoEnum.MOZO, label: mozo },
      { value: EstacionTipoEnum.CAJA, label: 'Caja' },
    ];
    this.tipoMap = {
      [EstacionTipoEnum.ADMINISTRADOR]: 'Administrador',
      [EstacionTipoEnum.MOZO]: mozo,
      [EstacionTipoEnum.CAJA]: 'Caja',
    };
  }
}
