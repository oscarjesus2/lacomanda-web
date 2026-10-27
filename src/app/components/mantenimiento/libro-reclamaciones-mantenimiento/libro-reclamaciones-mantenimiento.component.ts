import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { LibroReclamacion } from 'src/app/models/libro-reclamaciones.models';
import { LibroReclamacionesService } from 'src/app/services/libro-reclamaciones.service';
import { Notificar } from 'src/app/shared/notificaciones';

export interface LibroReclamacionesDialogData {
  codigo?: string;
}

@Component({
  selector: 'app-libro-reclamaciones-mantenimiento',
  templateUrl: './libro-reclamaciones-mantenimiento.component.html',
})
export class LibroReclamacionesMantenimientoComponent implements OnInit {
  reclamaciones: LibroReclamacion[] = [];
  seleccionada?: LibroReclamacion;
  cargando = false;

  constructor(
    private readonly service: LibroReclamacionesService,
    private readonly dialogRef: MatDialogRef<LibroReclamacionesMantenimientoComponent>,
    @Inject(MAT_DIALOG_DATA) readonly data: LibroReclamacionesDialogData | null,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.service.listar(this.data?.codigo)
      .pipe(finalize(() => (this.cargando = false)))
      .subscribe({
        next: response => {
          this.reclamaciones = response.Data ?? [];
          this.seleccionada = this.reclamaciones[0];
        },
        error: error => Notificar.error(
          error?.error?.Message || 'No se pudo cargar el Libro de Reclamaciones.',
        ),
      });
  }

  seleccionar(reclamacion: LibroReclamacion): void {
    this.seleccionada = reclamacion;
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
