import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { Notificar } from 'src/app/shared/notificaciones';
import { VistaTecladoTactil } from '../teclado-tactil/teclado-tactil.component';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';

/** Ancho para el teclado de importes; las letras necesitan más sitio. */
const COMPACTO = 'dialog-window--teclado-compacto';

interface DatosTecladoCantidad {
  title?: string;
  quantity?: string | number;
  /** Códigos y contraseñas: se muestra oculto y no se valida como importe. */
  hideNumber?: boolean;
  minAmount?: number;
  decimalActive?: boolean;
}

/**
 * Pide un importe o cantidad con el teclado en pantalla. El mismo teclado
 * permite pasar a letras cuando lo que se pide es un código o una contraseña.
 */
@Component({
  selector: 'app-dialog-mcant',
  templateUrl: './dialog-mcant.component.html',
  styleUrls: ['./dialog-mcant.component.css'],
})
export class DialogMCantComponent {
  inputValue = '';
  title: string;
  isPassword: boolean;
  minAmount: number;
  decimales: boolean;

  constructor(
    public dialogRef: MatDialogRef<DialogMCantComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatosTecladoCantidad,
    private readonly textCatalog: TenantTextCatalogService,
  ) {
    this.title = data?.title ?? '';
    this.inputValue = (data?.quantity ?? '').toString();
    this.isPassword = data?.hideNumber ?? false;
    this.minAmount = data?.minAmount ?? 0;
    this.decimales = data?.decimalActive ?? false;

    // El tamaño lo decide el teclado, no quien abre el diálogo: un importe
    // se pide en una caja estrecha y, si se pasa a letras, el diálogo se abre
    // para que quepa la fila completa.
    dialogRef.addPanelClass(['dialog-window--teclado', COMPACTO]);
    dialogRef.updateSize();
  }

  /** El teclado cambió de juego de teclas: el diálogo se ajusta. */
  onVistaTeclado(vista: VistaTecladoTactil): void {
    if (vista === 'numeros') this.dialogRef.addPanelClass(COMPACTO);
    else this.dialogRef.removePanelClass(COMPACTO);
  }

  clear(): void {
    this.inputValue = '';
  }

  accept(): void {
    const error = this.validar();
    if (error) {
      void Notificar.advertencia(this.textCatalog.get('validation'), error);
      return;
    }

    this.dialogRef.close({ value: this.inputValue });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  private validar(): string | null {
    if (!this.inputValue.trim()) {
      return this.textCatalog.get('mustEnterValue');
    }

    // Un código o una contraseña no se miden como importe.
    if (this.isPassword) {
      return null;
    }

    if (isNaN(Number(this.inputValue))) {
      return this.textCatalog.get('onlyNumericValues');
    }

    const numero = parseFloat(this.inputValue);
    if (numero <= 0) {
      return this.textCatalog.get('amountGreaterThanZero');
    }

    if (this.minAmount !== 0 && numero < this.minAmount) {
      return this.textCatalog.get('minimumAmountIs', { min: this.minAmount });
    }

    return null;
  }
}
