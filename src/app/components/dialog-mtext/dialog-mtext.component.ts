import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { Notificar } from 'src/app/shared/notificaciones';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';

interface DatosTecladoTexto {
  title?: string;
  text?: string;
  /** Algunas pantallas antiguas envían el valor inicial con este nombre. */
  texto?: string;
  maxLength?: number;
}

/**
 * Pide un texto. Se escribe con el teclado del equipo y, si la estación no
 * tiene, con el teclado en pantalla que ofrece el botón.
 */
@Component({
  selector: 'app-dialog-mtext-touch',
  templateUrl: './dialog-mtext.component.html',
  styleUrls: ['./dialog-mtext.component.css'],
})
export class DialogMTextComponent {
  inputValue = '';
  title: string;
  maxLength: number;

  constructor(
    public dialogRef: MatDialogRef<DialogMTextComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatosTecladoTexto,
    private readonly textCatalog: TenantTextCatalogService,
  ) {
    this.title = data?.title ?? '';
    this.inputValue = data?.text ?? data?.texto ?? '';
    this.maxLength = data?.maxLength ?? 0;

    // El diálogo se ajusta a la pantalla; el teclado va aparte, sobre el borde.
    dialogRef.addPanelClass('dialog-window--texto');
    dialogRef.updateSize();
  }

  clear(): void {
    this.inputValue = '';
  }

  accept(): void {
    if (!this.inputValue.trim()) {
      void Notificar.advertencia(
        this.textCatalog.get('validation'),
        this.textCatalog.get('mustEnterText'),
      );
      return;
    }

    this.dialogRef.close({ value: this.inputValue });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
