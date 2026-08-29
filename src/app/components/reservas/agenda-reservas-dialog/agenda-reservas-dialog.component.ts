import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { NivelUsuarioEnum } from 'src/app/enums/enum';
import { StorageService } from 'src/app/services/storage.service';

@Component({
  selector: 'app-agenda-reservas-dialog',
  templateUrl: './agenda-reservas-dialog.component.html'
})
export class AgendaReservasDialogComponent {
  readonly puedeGestionar: boolean;

  constructor(
    storage: StorageService,
    private readonly dialogRef: MatDialogRef<AgendaReservasDialogComponent>
  ) {
    const nivel = storage.getCurrentUser()?.IdNivel;
    this.puedeGestionar = nivel === NivelUsuarioEnum.Administrador || nivel === NivelUsuarioEnum.Cajero;
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
