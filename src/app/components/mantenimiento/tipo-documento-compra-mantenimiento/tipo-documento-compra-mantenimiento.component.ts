import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { TipoDocumentoCompraMantenimiento } from 'src/app/models/tipo-documento-compra.models';
import { TipoDocumentoCompraService } from 'src/app/services/tipo-documento-compra.service';
import { Notificar } from 'src/app/shared/notificaciones';

@Component({
  selector: 'app-tipo-documento-compra-mantenimiento',
  templateUrl: './tipo-documento-compra-mantenimiento.component.html',
})
export class TipoDocumentoCompraMantenimientoComponent implements OnInit {
  readonly displayedColumns = [
    'descripcion',
    'naturaleza',
    'mascara',
    'estado',
    'acciones',
  ];
  documentos: TipoDocumentoCompraMantenimiento[] = [];
  filtro = '';
  cargando = false;

  constructor(
    private readonly dialogRef:
      MatDialogRef<TipoDocumentoCompraMantenimientoComponent>,
    private readonly tipoDocumentoCompraService: TipoDocumentoCompraService,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  get documentosFiltrados(): TipoDocumentoCompraMantenimiento[] {
    const filtro = this.filtro.trim().toLocaleLowerCase();
    if (!filtro) {
      return this.documentos;
    }

    return this.documentos.filter(documento =>
      documento.Descripcion.toLocaleLowerCase().includes(filtro) ||
      documento.IdTipoDocumentoCompra.toLocaleLowerCase().includes(filtro),
    );
  }

  cambiarEstado(
    documento: TipoDocumentoCompraMantenimiento,
    activo: boolean,
  ): void {
    documento.Cambiando = true;
    this.tipoDocumentoCompraService.cambiarEstado(
      documento.IdTipoDocumentoCompra,
      { Activo: activo },
    ).subscribe({
      next: response => {
        documento.Cambiando = false;
        if (!response.Success || !response.Data) {
          this.mostrarError(response.Message);
          return;
        }

        documento.Activo = response.Data.Activo;
        Notificar.exito(
          'Disponibilidad actualizada',
          response.Message || 'El documento se actualizó correctamente.',
        );
      },
      error: error => {
        documento.Cambiando = false;
        this.mostrarError(error?.error?.Message);
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  naturaleza(documento: TipoDocumentoCompraMantenimiento): string {
    switch (documento.Naturaleza) {
      case 1:
        return 'Compra o servicio';
      case 2:
        return 'Comprobante simplificado';
      case 3:
        return 'Guía de remisión';
      case 4:
        return 'Nota de crédito';
      case 5:
        return 'Nota de débito';
      case 6:
        return 'Rectificativa';
      default:
        return 'Documento de compra';
    }
  }

  private cargar(): void {
    this.cargando = true;
    this.tipoDocumentoCompraService.listar().subscribe({
      next: response => {
        this.cargando = false;
        if (!response.Success) {
          this.mostrarError(response.Message);
          return;
        }

        this.documentos = response.Data || [];
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(error?.error?.Message);
      },
    });
  }

  private mostrarError(mensaje: string | undefined): void {
    Swal.fire(
      'Error',
      mensaje || 'No se pudo actualizar el documento.',
      'error',
    );
  }
}
