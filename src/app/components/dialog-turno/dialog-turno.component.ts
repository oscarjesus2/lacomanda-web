

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgxSpinnerService } from 'ngx-spinner';
import { CajaDto } from 'src/app/models/caja.models';
import { CajaService } from '../../services/caja.service';
import { StorageService } from 'src/app/services/storage.service';
import { MatDialogRef } from '@angular/material/dialog';
import { AbrirTurno } from 'src/app/models/turno.models';
import { TurnoService } from '../../services/turno.service';
import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';
import { Notificar } from 'src/app/shared/notificaciones';
import { MonedaService } from 'src/app/services/moneda.service';

@Component({
  selector: 'app-dialog-turno',
  templateUrl: './dialog-turno.component.html',
  styleUrls: ['./dialog-turno.component.css']
})
export class DialogTurnoComponent implements OnInit {
  turnoAbierto = false;
  nroTurnoAbierto = 0;
  procesando = false;
  tieneMultiplesMonedas = false;
  myForm: FormGroup;
  listCaja: CajaDto[] = [];
 
  constructor(
    public dialogRef: MatDialogRef<DialogTurnoComponent>,
    private fb: FormBuilder,
    private storageService: StorageService,
    private spinnerService: NgxSpinnerService,
    private cajaService: CajaService,
    private monedaService: MonedaService,
    private turnoService: TurnoService,
    private texts: TenantTextCatalogService,
  ) {
    this.myForm = this.fb.group({
      fecha: [new Date(), [Validators.required]],
      caja: [null, [Validators.required]],
      tipocambio: [{ value: 1, disabled: true }, [
        Validators.required,
        Validators.min(0.0001),
        Validators.pattern(/^[0-9]+([.][0-9]+)?$/)
      ]],
    });
  }

  async ngOnInit(): Promise<void> {
    this.spinnerService.show();
    try {
      await this.configurarTipoCambioPorMonedas();
      await this.listarCajas();
    } finally {
      this.spinnerService.hide();
    }
  }

  private async configurarTipoCambioPorMonedas(): Promise<void> {
    const resp = await firstValueFrom(this.monedaService.getMoneda());
    this.tieneMultiplesMonedas = (resp?.Data?.length ?? 0) > 1;
  }

  private async listarCajas(idCajaPreferida?: number): Promise<void> {
    const incluyeGeneral = true;
    const resp = await firstValueFrom(
      this.cajaService.getAllCaja(incluyeGeneral)
    );
    this.listCaja = resp?.Data ?? [];

    const cajaSeleccionada =
      this.listCaja.find(caja => caja.IdCaja === idCajaPreferida)
      ?? this.listCaja[0];

    if (cajaSeleccionada) {
      this.myForm.get('caja')!.setValue(cajaSeleccionada.IdCaja);
      this.validarTurnoAbierto(cajaSeleccionada);
    }
  }

  public salir(): void {
    if (this.procesando) {
      return;
    }
    this.myForm.reset();
    this.dialogRef.close();
  }

  onCajaSeleccionada(idCaja: number): void {
    const caja = this.listCaja.find(item => item.IdCaja === idCaja);
    if (caja) {
      this.validarTurnoAbierto(caja);
    }
  }

  private validarTurnoAbierto(caja: CajaDto): void {
    if (caja.TurnoAbierto != null) {
      this.turnoAbierto = true;
      this.nroTurnoAbierto = caja.TurnoAbierto.IdTurno;

      this.myForm.get('tipocambio')!.setValue(
        caja.TurnoAbierto.TipoCambioVenta
      );
      this.myForm.get('fecha')!.setValue(
        new Date(caja.TurnoAbierto.FechaInicio)
      );
      this.myForm.get('tipocambio')!.disable({ emitEvent: false });
    } else {
      this.turnoAbierto = false;
      this.nroTurnoAbierto = 0;
      const tipoCambio = this.myForm.get('tipocambio')!;
      if (this.tieneMultiplesMonedas) {
        tipoCambio.enable({ emitEvent: false });
        tipoCambio.setValue(null);
      } else {
        tipoCambio.setValue(1);
        tipoCambio.disable({ emitEvent: false });
      }
      this.myForm.get('fecha')!.setValue(new Date());
    }
  }

  async abrirTurno(): Promise<void> {
    if (this.turnoAbierto || this.procesando) {
      return;
    }

    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }

    this.procesando = true;
    this.spinnerService.show();

    try {
      const raw = this.myForm.getRawValue();
      const IdCaja: number = raw.caja;
      const FechaTrabajo: string = new Date(raw.fecha).toISOString();
      const TipoCambioVenta: number = parseFloat(raw.tipocambio);
      const UsuReg: number = this.storageService.getCurrentSession().User.IdUsuario;

      const oTurno: AbrirTurno = {
        IdCaja,
        FechaTrabajo,
        TipoCambioVenta,
        UsuReg
      };

      const responseAbrirTurno = await firstValueFrom(
        this.turnoService.AbrirTurno(oTurno)
      );

      if (responseAbrirTurno) {
        await this.listarCajas(responseAbrirTurno.IdCaja);
        Notificar.exito(this.texts.get('shiftOpenedTitle'),
          this.texts.get('registerAvailableForOperations'));
      }
    } finally {
      this.procesando = false;
      this.spinnerService.hide();
    }
  }
}
