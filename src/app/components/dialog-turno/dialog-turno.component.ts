

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { NgxSpinnerService } from 'ngx-spinner';
import { Caja } from 'src/app/models/caja.models';
import { CajaService } from '../../services/caja.service';
import { StorageService } from 'src/app/services/storage.service';
import { DatePipe } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';
import { AbrirTurno, Turno } from 'src/app/models/turno.models';
import { TurnoService } from '../../services/turno.service';
import * as moment from 'moment'
import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-dialog-turno',
  templateUrl: './dialog-turno.component.html',
  styleUrls: ['./dialog-turno.component.css']
})
export class DialogTurnoComponent implements OnInit {
  TurnoAbierto: boolean;
  NroTurnoAbierto: number;
  today = new Date();
  myForm: FormGroup;
  listCaja: Caja[];
 
  constructor(
    public dialogRef: MatDialogRef<DialogTurnoComponent>,
    public fb: FormBuilder,
    private storageService: StorageService,
    private spinnerService: NgxSpinnerService,
    private cajaService: CajaService,
    private TurnoService: TurnoService,
  ) {


    this.TurnoAbierto = false;
    this.NroTurnoAbierto=0;
 
    this.myForm = this.fb.group({
      fecha: [new Date(), [Validators.required]],
      caja: [0, [Validators.required]],
      tipocambio: ['', [Validators.required,
      Validators.maxLength(5),
      Validators.pattern(/^[0-9]+([.])?([0-9]+)?$/)]],
    });
  }

  async ngOnInit() {

    this.spinnerService.show();

    try {
      this.ListarCaja();
    }
    finally {
      this.spinnerService.hide();
    }
  }

 async ListarCaja() {
  const incluyeGeneral = true;
  const resp = await firstValueFrom(this.cajaService.getAllCaja(incluyeGeneral));
  this.listCaja = resp.Data;

  if (this.listCaja && this.listCaja.length > 0) {
    // siempre tomar la primera caja
    const primeraCaja = this.listCaja[0];
    this.myForm.get('caja')!.setValue(primeraCaja.IdCaja);
    this.ValidarTurnoAbierto(primeraCaja);
  }
}

  public salir(): void {
    this.myForm.reset();
    this.dialogRef.close();
  }

  ValidarTurnoAbierto(oCaja: Caja): void {
    if (oCaja.TurnoAbierto != null) {
      this.TurnoAbierto = true;
      this.NroTurnoAbierto = oCaja.TurnoAbierto.IdTurno;

      this.myForm.get('tipocambio')!.setValue(oCaja.TurnoAbierto.TipoCambioVenta);
      this.myForm.get('fecha')!.setValue(new Date(oCaja.TurnoAbierto.FechaInicio));

      this.myForm.get('tipocambio')!.disable();
      this.myForm.get('fecha')!.disable();
    } else {
      this.TurnoAbierto = false;
      this.myForm.get('tipocambio')!.setValue(0);
      this.myForm.get('fecha')!.setValue(new Date());
      this.myForm.get('tipocambio')!.enable();
      this.myForm.get('fecha')!.enable();
    }
  }

    async saveData() {
    try {
      if (this.myForm.invalid) return;

      this.spinnerService.show();

      const raw = this.myForm.getRawValue();
      const IdCaja: number = raw.caja;
      const FechaTrabajo: string = new Date(raw.fecha).toISOString(); // ISO con Z
      const TipoCambioVenta: number = parseFloat(raw.tipocambio);
      const UsuReg: number = this.storageService.getCurrentSession().User.IdUsuario;

      const oTurno: AbrirTurno = {
        IdCaja,
        FechaTrabajo,
        TipoCambioVenta,
        UsuReg
      };

      const responseAbrirTurno = await firstValueFrom(this.TurnoService.AbrirTurno(oTurno));

      if (responseAbrirTurno) {
        await this.ListarCaja();
        const cajaResp = this.listCaja.find(x => x.IdCaja === responseAbrirTurno.IdCaja);
        if (cajaResp) this.ValidarTurnoAbierto(cajaResp);
        Swal.fire('OK', 'Turno aperturado', 'success');
      }
    } finally {
      this.spinnerService.hide();
    }
  }

}