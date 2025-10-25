import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { NgForm } from '@angular/forms';

import Swal from 'sweetalert2';
import { NgxSpinnerService } from 'ngx-spinner';

import { Mesas } from 'src/app/models/mesas.models';
import { Ambiente } from 'src/app/models/ambiente.models';
import { MesasService } from 'src/app/services/mesas.service';
import { AmbienteService } from 'src/app/services/ambiente.service';
import { PosicionSelectorDialogComponent, PosicionSelectorData } from '../../posicion-selector-dialog/posicion-selector-dialog.component';

@Component({
  selector: 'app-mesas-mantenimiento',
  templateUrl: './mesas-mantenimiento.component.html',
  styleUrls: ['./mesas-mantenimiento.component.css']
})
export class MesasMantenimientoComponent implements OnInit, AfterViewInit {
  @ViewChild('mesaForm') mesaForm: NgForm;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  // Estado UI
  showForm = false;
  descripcionesEjemplo = ['Mesa','Barra','Box','Lounge','Mostrador'];

  // Datos
  mesa: Mesas = new Mesas();
  mesas: Mesas[] = [];
  filteredMesas = new MatTableDataSource<Mesas>([]);
  filtroMesa: string = '';

  // Ambientes
  listAmbientes: Ambiente[] = [];
  selectedAmbiente: Ambiente | null = null;

  // Tabla
  displayedColumns: string[] = ['descripcion', 'numero', 'posicion', 'ambiente', 'activo', 'visible', 'actions'];

  // Grid (parametrizable en duro por mientras)
  readonly GRID_ROWS = 9;
  readonly GRID_COLS = 7;

  constructor(
    private dialogRef: MatDialogRef<MesasMantenimientoComponent>,
    private dialog: MatDialog,
    private mesaService: MesasService,
    private ambienteService: AmbienteService,
    private spinnerService: NgxSpinnerService
  ) {}

  ngOnInit(): void {
    this.cargarMesas();
    this.cargarAmbientes();
  }

  ngAfterViewInit(): void {
    this.filteredMesas.paginator = this.paginator;
  }

  // ---------- CARGAS ----------
  cargarMesas(): void {
    this.spinnerService.show();
    this.mesaService.GetAllMesas().subscribe({
      next: (res) => {
        if (res.Success) {
          this.mesas = res.Data || [];
          this.filteredMesas.data = this.mesas;
        } else {
          Swal.fire('Error', res.Message || 'Error al cargar las mesas', 'error');
        }
        this.spinnerService.hide();
        this.filteredMesas.paginator = this.paginator;
      },
      error: () => {
        this.spinnerService.hide();
        Swal.fire('Error', 'No se pudo cargar las mesas', 'error');
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
    const filterValue = (this.filtroMesa || '').toLowerCase();
    this.filteredMesas.data = this.mesas.filter(m =>
      (m.Descripcion || '').toLowerCase().includes(filterValue) ||
      String(m.Numero || '').toLowerCase().includes(filterValue) ||
      String(m.Posicion || '').toLowerCase().includes(filterValue) ||
      (this.getAmbienteDescripcion(m.IdAmbiente) || '').toLowerCase().includes(filterValue)
    );
  }

  getAmbienteDescripcion(idAmbiente: number): string {
    return this.listAmbientes.find(a => a.IdAmbiente === idAmbiente)?.Descripcion || '';
  }

  // ---------- FORM ----------
  nuevaMesa(): void {
    this.resetForm();
    this.showForm = true;
  }

  onEdit(mesa: Mesas): void {
    this.mesa = { ...mesa };
    this.selectedAmbiente = this.listAmbientes.find(a => a.IdAmbiente === mesa.IdAmbiente) || null;
    this.showForm = true;
  }

  onDelete(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'No podrás revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar!',
      cancelButtonText: 'No, cancelar!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.mesaService.deleteMesa(id).subscribe({
          next: () => {
            this.cargarMesas();
            Swal.fire('Mesa eliminada', '', 'success');
          },
          error: () => Swal.fire('Error', 'No se pudo eliminar la mesa', 'error')
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
    this.mesa.IdAmbiente = this.selectedAmbiente.IdAmbiente;

    if (this.mesaForm.invalid || !this.mesa.Posicion) {
      this.markFormTouchedAndDirty(this.mesaForm);
      if (!this.mesa.Posicion) {
        Swal.fire('Validación', 'Debe elegir una posición.', 'info');
      }
      return;
    }

    if (this.mesa.IdMesa) {
      this.mesaService.updateMesa(this.mesa).subscribe({
        next: (res) => {
          if (res.Success) {
            this.cargarMesas();
            this.showForm = false;
            Swal.fire('Mesa actualizada', '', 'success');
          } else {
            Swal.fire('Error', res.Message || 'Error al actualizar la mesa', 'error');
          }
        },
        error: () => Swal.fire('Error', 'No se pudo actualizar la mesa', 'error')
      });
    } else {
      this.mesaService.createMesa(this.mesa).subscribe({
        next: (res) => {
          if (res.Success) {
            this.cargarMesas();
            this.showForm = false;
            Swal.fire('Mesa creada', '', 'success');
          } else {
            Swal.fire('Error', res.Message || 'Error al crear la mesa', 'error');
          }
        },
        error: () => Swal.fire('Error', 'No se pudo crear la mesa', 'error')
      });
    }
  }

  cancelar(): void {
    this.resetForm();
    this.cargarMesas();
    this.showForm = false;
  }

  resetForm(): void {
    this.mesa = new Mesas();
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

    // Posiciones ocupadas en el ambiente seleccionado (excluyendo la mesa actual si está editando)
    const ocupadas = this.mesas
      .filter(m => m.IdAmbiente === this.selectedAmbiente!.IdAmbiente)
      .filter(m => !(this.mesa.IdMesa && m.IdMesa === this.mesa.IdMesa))
      .map(m => m.Posicion);

    const data: PosicionSelectorData = {
      rows: this.GRID_ROWS,
      cols: this.GRID_COLS,
      occupied: ocupadas,
      initial: this.mesa.Posicion || null
    };

    const ref = this.dialog.open(PosicionSelectorDialogComponent, {
      width: '640px',
      data
    });

    ref.afterClosed().subscribe((pos: number | null) => {
      if (pos) {
        this.mesa.Posicion = pos;
      }
    });
  }
}
