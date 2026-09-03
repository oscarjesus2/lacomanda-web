import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { NgForm } from '@angular/forms';

import Swal from 'sweetalert2';
import { NgxSpinnerService } from 'ngx-spinner';

import { Espacios } from 'src/app/models/espacios.models';
import { Ambiente } from 'src/app/models/ambiente.models';
import { EspaciosService } from 'src/app/services/espacios.service';
import { AmbienteService } from 'src/app/services/ambiente.service';
import { PosicionSelectorDialogComponent, PosicionSelectorData } from '../../posicion-selector-dialog/posicion-selector-dialog.component';
import { Notificar } from 'src/app/shared/notificaciones';
import { ordenarEspaciosPorTipoYNumero } from './espacios-order';

@Component({
  selector: 'app-espacios-mantenimiento',
  templateUrl: './espacios-mantenimiento.component.html'
})
export class EspaciosMantenimientoComponent implements OnInit {
  @ViewChild('espacioForm') espacioForm: NgForm;
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.filteredEspacios.paginator = value;
    }
  }

  // Estado UI
  showForm = false;
  descripcionesEjemplo = ['Mesa', 'Barra', 'Box', 'Lounge', 'Mostrador'];

  // Datos
  espacio: Espacios = new Espacios();
  espacios: Espacios[] = [];
  filteredEspacios = new MatTableDataSource<Espacios>([]);
  filtroEspacio: string = '';

  // Ambientes
  listAmbientes: Ambiente[] = [];
  selectedAmbiente: Ambiente | null = null;

  // Tabla
  displayedColumns: string[] = ['descripcion', 'numero', 'posicion', 'ambiente', 'activo', 'visible', 'actions'];

  // Grid (parametrizable en duro por mientras)
  readonly GRID_ROWS = 9;
  readonly GRID_COLS = 7;

  constructor(
    private dialogRef: MatDialogRef<EspaciosMantenimientoComponent>,
    private dialog: MatDialog,
    private espacioService: EspaciosService,
    private ambienteService: AmbienteService,
    private spinnerService: NgxSpinnerService
  ) {}

  ngOnInit(): void {
    this.cargarEspacios();
    this.cargarAmbientes();
  }

  // ---------- CARGAS ----------
  cargarEspacios(): void {
    this.spinnerService.show();
    this.espacioService.GetAllEspacios().subscribe({
      next: (res) => {
        if (res.Success) {
          this.espacios = ordenarEspaciosPorTipoYNumero(res.Data || []);
          this.filteredEspacios.data = this.espacios;
        } else {
          Swal.fire('Error', res.Message || 'Error al cargar los espacios', 'error');
        }
        this.spinnerService.hide();
      },
      error: () => {
        this.spinnerService.hide();
        Swal.fire('Error', 'No se pudieron cargar los espacios', 'error');
      }
    });
  }

  cargarAmbientes(): void {
    this.spinnerService.show();
    this.ambienteService.getAllAmbiente().subscribe({
      next: (res) => {
        if (res.Success) {
          this.listAmbientes = res.Data || [];
        } else {
          Swal.fire('Error', res.Message || 'Error al cargar ambientes', 'error');
        }
        this.spinnerService.hide();
      },
      error: () => {
        this.spinnerService.hide();
        Swal.fire('Error', 'No se pudo cargar los ambientes', 'error');
      }
    });
  }

  // ---------- LISTA ----------
  applyFilter(): void {
    const filterValue = (this.filtroEspacio || '').trim().toLowerCase();
    this.filteredEspacios.data = this.espacios.filter(m =>
      (m.Descripcion || '').toLowerCase().includes(filterValue) ||
      String(m.Numero || '').toLowerCase().includes(filterValue) ||
      String(m.Posicion || '').toLowerCase().includes(filterValue) ||
      (this.getAmbienteDescripcion(m.IdAmbiente) || '').toLowerCase().includes(filterValue)
    );
    this.filteredEspacios.paginator?.firstPage();
  }

  getAmbienteDescripcion(idAmbiente: number): string {
    return this.listAmbientes.find(a => a.IdAmbiente === idAmbiente)?.Descripcion || '';
  }

  // ---------- FORM ----------
  nuevaEspacio(): void {
    this.resetForm();
    this.showForm = true;
  }

  onEdit(espacio: Espacios): void {
    this.espacio = { ...espacio };
    this.selectedAmbiente = this.listAmbientes.find(a => a.IdAmbiente === espacio.IdAmbiente) || null;
    this.showForm = true;
  }

  imprimirQr(espacio: Espacios): void {
    this.spinnerService.show();
    this.espacioService.obtenerQrPdf(espacio.IdEspacio).subscribe({
      next: blob => {
        this.spinnerService.hide();
        this.abrirPdf(blob);
      },
      error: () => {
        this.spinnerService.hide();
        Swal.fire('Error', 'No se pudo generar el QR del espacio.', 'error');
      }
    });
  }

  imprimirTodosLosQr(): void {
    this.spinnerService.show();
    this.espacioService.obtenerTodosQrPdf().subscribe({
      next: blob => {
        this.spinnerService.hide();
        this.abrirPdf(blob);
      },
      error: () => {
        this.spinnerService.hide();
        Swal.fire('Error', 'No se pudo generar el documento con todos los QR.', 'error');
      }
    });
  }

  regenerarQr(espacio: Espacios): void {
    Swal.fire({
      title: '¿Regenerar el QR?',
      text: 'El QR que ya esté impreso dejará de funcionar.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, regenerar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }

      this.spinnerService.show();
      this.espacioService.regenerarQrPdf(espacio.IdEspacio).subscribe({
        next: blob => {
          this.spinnerService.hide();
          this.abrirPdf(blob);
          Notificar.exito('QR regenerado', 'Imprime y reemplaza el QR anterior.');
        },
        error: () => {
          this.spinnerService.hide();
          Swal.fire('Error', 'No se pudo regenerar el QR.', 'error');
        }
      });
    });
  }

  private abrirPdf(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const nuevaVentana = window.open(url, '_blank');
    if (!nuevaVentana) {
      URL.revokeObjectURL(url);
      Swal.fire(
        'Ventana bloqueada',
        'Permite las ventanas emergentes para abrir el documento PDF.',
        'info'
      );
      return;
    }

    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

    onDelete(id: number): void {
      Swal.fire({
        title: '¿Estás seguro?',
        text: "No podrás revertir esto!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar!',
        cancelButtonText: 'No, cancelar!'
      }).then((result) => {
        if (result.isConfirmed) {
          this.espacioService.deleteEspacio(id).subscribe(() => {
            this.cargarEspacios();
            Notificar.exito('Espacio eliminado', '');
          });
        }
      });
    }

  private markFormTouchedAndDirty(form: NgForm): void {
    Object.values(form.controls).forEach(control => {
      control.markAsTouched();
      control.markAsDirty();
    });
  }

  onSubmit(): void {
    // Sin ambiente seleccionado, no se permite
    if (!this.selectedAmbiente) {
      Swal.fire('Validación', 'Seleccione un ambiente.', 'info');
      return;
    }
    // Seteamos IdAmbiente desde el combo
    this.espacio.IdAmbiente = this.selectedAmbiente.IdAmbiente;

    if (this.espacioForm.invalid || !this.espacio.Posicion) {
      this.markFormTouchedAndDirty(this.espacioForm);
      if (!this.espacio.Posicion) {
        Swal.fire('Validación', 'Debe elegir una posición.', 'info');
      }
      return;
    }

    if (this.espacio.IdEspacio) {
      this.espacioService.updateEspacio(this.espacio).subscribe({
        next: (res) => {
          if (res.Success) {
            this.cargarEspacios();
            this.showForm = false;
            Notificar.exito('Espacio actualizado', '');
          } else {
            Swal.fire('Error', res.Message || 'Error al actualizar el espacio', 'error');
          }
        },
        error: () => Swal.fire('Error', 'No se pudo actualizar el espacio', 'error')
      });
    } else {
      this.espacioService.createEspacio(this.espacio).subscribe({
        next: (res) => {
          if (res.Success) {
            this.cargarEspacios();
            this.showForm = false;
            Notificar.exito('Espacio creado', '');
          } else {
            Swal.fire('Error', res.Message || 'Error al crear el espacio', 'error');
          }
        },
        error: () => Swal.fire('Error', 'No se pudo crear el espacio', 'error')
      });
    }
  }

  cancelar(): void {
    this.resetForm();
    this.cargarEspacios();
    this.showForm = false;
  }

  resetForm(): void {
    this.espacio = new Espacios();
    this.selectedAmbiente = null;
  }

  salir(): void {
    this.dialogRef.close();
  }

  compareAmbiente(a1: Ambiente, a2: Ambiente): boolean {
    return a1 && a2 ? a1.IdAmbiente === a2.IdAmbiente : a1 === a2;
  }

  // ---------- POSICIÓN ----------
  onAmbienteChange(): void {
    // Al elegir ambiente, abrir selector de posición automáticamente
    this.abrirSelectorPosicion();
  }

  abrirSelectorPosicion(): void {
    if (!this.selectedAmbiente) {
      Swal.fire('Validación', 'Seleccione un ambiente primero.', 'info');
      return;
    }

    // Posiciones ocupadas en el ambiente seleccionado (excluyendo el espacio actual si está editando)
    const ocupadas = this.espacios
      .filter(m => m.IdAmbiente === this.selectedAmbiente!.IdAmbiente)
      .filter(m => !(this.espacio.IdEspacio && m.IdEspacio === this.espacio.IdEspacio))
      .map(m => m.Posicion);

    const data: PosicionSelectorData = {
      rows: this.GRID_ROWS,
      cols: this.GRID_COLS,
      occupied: ocupadas,
      initial: this.espacio.Posicion || null
    };

    const ref = this.dialog.open(PosicionSelectorDialogComponent, {
      width: '640px',
      data
    });

    ref.afterClosed().subscribe((pos: number | null) => {
      if (pos) {
        this.espacio.Posicion = pos;
      }
    });
  }
}
