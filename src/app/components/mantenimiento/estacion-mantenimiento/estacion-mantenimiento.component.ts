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
import { LicenciaTenantService } from 'src/app/services/licencia-tenant.service';
import { AreaAlmacenService } from 'src/app/services/area-almacen.service';
import { SubAreaAlmacenService } from 'src/app/services/sub-area-almacen.service';
import { AreaAlmacen } from 'src/app/models/receta.models';
import { SubAreaAlmacen } from 'src/app/models/almacen-maestro.models';
import { forkJoin } from 'rxjs';

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
  licenciaAlmacenVerificada = false;
  almacenHabilitado = false;
  catalogoAlmacenCargado = false;
  cargandoDescargasStock = false;
  descargaStockHabilitada = false;
  areasAlmacen: AreaAlmacen[] = [];
  subAreasAlmacen: SubAreaAlmacen[] = [];
  descargasStockPorArea: Record<number, number | null> = {};

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
    private readonly licenciaTenantService: LicenciaTenantService,
    private readonly areaAlmacenService: AreaAlmacenService,
    private readonly subAreaAlmacenService: SubAreaAlmacenService,
  ) {}

  ngOnInit(): void {
    this.inicializarTipos();
    this.cargarEstaciones();
    this.cargarCajas();
    this.cargarLicenciaAlmacen();
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
      return 'Al guardar, esta estación quedará vinculada al equipo que estás usando.';
    }
    if (this.esEsteDispositivo) {
      return 'Esta estación ya está vinculada a este equipo.';
    }
    if (this.estacion.IdentificadorUnico) {
      return 'Esta estación está vinculada a un equipo diferente. Solo reemplázalo si deseas usarla en este equipo.';
    }
    return 'Esta estación todavía no está vinculada a ningún equipo. Puedes hacerlo ahora o más adelante.';
  }

  get textoAccionDispositivo(): string {
    if (this.esEsteDispositivo && !this.seVincularaEsteDispositivo) {
      return 'Equipo vinculado';
    }
    return this.estacion.IdentificadorUnico
      ? 'Vincular este equipo en su lugar'
      : 'Vincular este equipo';
  }

  get configuracionDescargaStockValida(): boolean {
    if (!this.licenciaAlmacenVerificada) return false;
    if (!this.almacenHabilitado) return true;
    if (this.cargandoDescargasStock) return false;
    if (!this.descargaStockHabilitada) return true;
    if (!this.catalogoAlmacenCargado) return false;
    return this.areasAlmacen.every(area =>
      this.subAreasPorArea(area.IdArea).length > 0 &&
      Number(this.descargasStockPorArea[area.IdArea]) > 0
    );
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
          this.estaciones = (resp.Data ?? []).map(estacion =>
            this.normalizarEstacionSembrada(estacion)
          );
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
    this.inicializarDescargasStock();
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

    const estacionDestino = this.estacion.Descripcion || 'esta estación';
    const estacionAnterior = estacionDeEsteDispositivo?.Descripcion || 'la estación anterior';
    let mensaje = `Al guardar, este equipo quedará configurado como ${estacionDestino}.`;

    if (reemplazaOtroDispositivo && estacionDeEsteDispositivo) {
      mensaje =
        `Al guardar, este equipo sustituirá al que está vinculado a ${estacionDestino} ` +
        `y dejará de estar asignado a ${estacionAnterior}. El otro equipo cerrará su sesión ` +
        `y ${estacionAnterior} quedará disponible para vincular otro dispositivo.`;
    } else if (reemplazaOtroDispositivo) {
      mensaje =
        `Al guardar, este equipo sustituirá al que está vinculado a ${estacionDestino}. ` +
        'El otro equipo cerrará su sesión.';
    } else if (estacionDeEsteDispositivo) {
      mensaje =
        `Al guardar, este equipo dejará de estar asignado a ${estacionAnterior} ` +
        `y pasará a ${estacionDestino}. ${estacionAnterior} quedará disponible para vincular otro dispositivo.`;
    }

    const result = await Swal.fire({
      title: reemplazaOtroDispositivo || estacionDeEsteDispositivo
        ? `Usar este equipo en ${estacionDestino}`
        : `Configurar este equipo como ${estacionDestino}`,
      text: mensaje,
      icon: reemplazaOtroDispositivo || estacionDeEsteDispositivo ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: reemplazaOtroDispositivo || estacionDeEsteDispositivo
        ? 'Preparar cambio'
        : 'Usar este equipo',
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

    if (!this.configuracionDescargaStockValida) {
      Swal.fire(
        'Descarga de stock incompleta',
        'Selecciona una subárea activa para cada área de almacén.',
        'warning',
      );
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
    const estacionNormalizada = this.normalizarEstacionSembrada(row);
    this.estacion = Object.assign(new Estacion(), {
      ...estacionNormalizada,
      IdEstacion: Number(estacionNormalizada.IdEstacion),
      IdCaja: Number(estacionNormalizada.IdCaja),
      Tipo: Number(estacionNormalizada.Tipo) as EstacionTipoEnum,
      IdentificadorUnico: estacionNormalizada.IdentificadorUnico,
    });
    this.identificadorPendiente = '';
    this.descargaStockHabilitada = false;
    this.showForm = true;
    if (this.almacenHabilitado) {
      this.cargarDescargasStock(Number(row.IdEstacion));
    }
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
    this.descargaStockHabilitada = false;
    this.descargasStockPorArea = {};
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
    if (this.almacenHabilitado) {
      const idsSubAreas = this.descargaStockHabilitada
        ? this.areasAlmacen.map(area =>
          Number(this.descargasStockPorArea[area.IdArea])
        )
        : [];
      this.estacionService.updateStockDischarges(
        Number(guardada.IdEstacion),
        idsSubAreas,
      ).subscribe({
        next: configuracion => {
          if (!configuracion.Success) {
            this.finalizarConError(
              configuracion.Message || 'No se pudo guardar la descarga de stock.'
            );
            return;
          }
          this.continuarDespuesDeConfigurarStock(guardada);
        },
        error: error => this.finalizarConError(
          error?.error?.Message ||
          'La estación se guardó, pero no se pudo configurar la descarga de stock.'
        ),
      });
      return;
    }

    this.continuarDespuesDeConfigurarStock(guardada);
  }

  private continuarDespuesDeConfigurarStock(guardada: Estacion): void {
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

  private cargarLicenciaAlmacen(): void {
    this.licenciaTenantService.obtener().subscribe({
      next: response => {
        if (!response.Success) {
          Swal.fire(
            'Error',
            response.Message || 'No se pudo verificar la licencia del restaurante.',
            'error',
          );
          return;
        }
        const licencia = response.Data;
        this.licenciaAlmacenVerificada = true;
        this.almacenHabilitado = (
          licencia == null ||
          licencia.Caracteristicas?.some(caracteristica =>
            caracteristica.Codigo === 'almacen.gestion' &&
            caracteristica.Habilitada
          ) === true
        );
        if (!this.almacenHabilitado) return;

        this.cargarCatalogoAlmacen();
        if (this.showForm && this.estacion.IdEstacion) {
          this.cargarDescargasStock(Number(this.estacion.IdEstacion));
        }
      },
      error: () => {
        this.licenciaAlmacenVerificada = false;
        this.almacenHabilitado = false;
        Swal.fire(
          'Error',
          'No se pudo verificar la licencia del restaurante.',
          'error',
        );
      },
    });
  }

  private cargarCatalogoAlmacen(): void {
    this.catalogoAlmacenCargado = false;
    forkJoin({
      areas: this.areaAlmacenService.listarActivas(),
      subAreas: this.subAreaAlmacenService.listar(),
    }).subscribe({
      next: ({ areas, subAreas }) => {
        if (!areas.Success || !subAreas.Success) {
          Swal.fire(
            'Error',
            areas.Message || subAreas.Message || 'No se pudo cargar el catálogo de almacén.',
            'error',
          );
          return;
        }
        this.areasAlmacen = (areas.Data ?? []).filter(area => area.Activo);
        this.subAreasAlmacen = (subAreas.Data ?? []).filter(subArea => subArea.Activo);
        if (!this.areasAlmacen.length) {
          this.descargaStockHabilitada = false;
        }
        this.catalogoAlmacenCargado = true;
        this.inicializarDescargasStock(true);
      },
      error: () => Swal.fire(
        'Error',
        'No se pudo cargar el catálogo para configurar la descarga de stock.',
        'error',
      ),
    });
  }

  private cargarDescargasStock(idEstacion: number): void {
    this.cargandoDescargasStock = true;
    this.estacionService.getStockDischarges(idEstacion)
      .pipe(finalize(() => this.cargandoDescargasStock = false))
      .subscribe({
        next: response => {
          if (!response.Success) {
            Swal.fire(
              'Error',
              response.Message || 'No se pudo cargar la descarga de stock.',
              'error',
            );
            return;
          }
          const descargas = response.Data ?? [];
          const seleccionActual: Record<number, number | null> = {};
          descargas.forEach(descarga => {
            seleccionActual[descarga.IdAreaAlmacen] = descarga.IdSubAreaAlmacen;
          });
          this.descargaStockHabilitada = descargas.length > 0 &&
            (!this.catalogoAlmacenCargado || this.areasAlmacen.length > 0);
          this.descargasStockPorArea = seleccionActual;
          this.inicializarDescargasStock(true);
        },
        error: error => Swal.fire(
          'Error',
          error?.error?.Message || 'No se pudo cargar la descarga de stock.',
          'error',
        ),
      });
  }

  subAreasPorArea(idArea: number): SubAreaAlmacen[] {
    return this.subAreasAlmacen.filter(subArea =>
      Number(subArea.IdAreaAlmacen) === Number(idArea)
    );
  }

  private inicializarDescargasStock(conservarSeleccion = false): void {
    const seleccionActual = conservarSeleccion
      ? { ...this.descargasStockPorArea }
      : {};
    const nuevaSeleccion: Record<number, number | null> = {};
    this.areasAlmacen.forEach(area => {
      const opciones = this.subAreasPorArea(area.IdArea);
      nuevaSeleccion[area.IdArea] = seleccionActual[area.IdArea]
        ?? (opciones.length === 1 ? opciones[0].IdSubAreaAlmacen : null);
    });
    this.descargasStockPorArea = nuevaSeleccion;
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

  private normalizarEstacionSembrada(estacion: Estacion): Estacion {
    const identificador = (estacion.IdentificadorUnico ?? '').trim();
    const descripcion = (estacion.Descripcion ?? '').trim().toUpperCase();
    const esIdentificadorInicial =
      (/^CAJA-\d{2}$/.test(identificador.toUpperCase()) && /^CAJA(?: \d+)?$/.test(descripcion)) ||
      (/^MOZO-\d{2}$/.test(identificador.toUpperCase()) && /^MOZO(?: \d+)?$/.test(descripcion)) ||
      (identificador.toUpperCase() === 'ADMIN-01' && descripcion === 'ADMINISTRADOR');

    return Object.assign(new Estacion(), {
      ...estacion,
      IdentificadorUnico: esIdentificadorInicial ? '' : identificador,
    });
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
