

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { NgxSpinnerService } from 'ngx-spinner';
import { Caja } from 'src/app/models/caja.models';
import { CajaService } from '../../services/caja.services';
import { StorageService } from 'src/app/services/storage.services';
import { DatePipe } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';
import { Turno } from 'src/app/models/turno.models';
import { TurnoService } from '../../services/turno.services';
import * as moment from 'moment'
import Swal from 'sweetalert2';

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
      fecha: [moment(this.today).format("DD/MM/YYYY HH:mm:ss"), [Validators.required]],
      caja: ['001', [Validators.required]],
      tipocambio: ['', [Validators.required,
      Validators.maxLength(5),
      Validators.pattern(/^[0-9]+([.])?([0-9]+)?$/)]],
    });


  }


  async ngOnInit() {

    this.spinnerService.show();

    try {

 
      // 1. Se carga servicio para obtener cajas
      this.ListarCaja();
 
    } catch (e) {
   
      Swal.fire(
        'Algo anda mal',
        e.error,
        'error'
      )
      console.log(e);
    }
    finally {
      this.spinnerService.hide();
    }
  }

  async ListarCaja(){
    var incluyeGeneral: number;
    incluyeGeneral=1;
    await this.cajaService.getAllCaja(incluyeGeneral).subscribe(Caja => {
      this.listCaja=Caja;
      this.ValidarTurnoAbierto(this.listCaja.find(x=> x.IdCaja=='001'));  
    });
  }
  public salir(): void {
    this.myForm.reset();
    this.dialogRef.close();
  }

  ValidarTurnoAbierto(oCaja: Caja): void {
  
    if (oCaja.TurnoAbierto != null) {
      this.TurnoAbierto = true;
      this.NroTurnoAbierto= oCaja.TurnoAbierto.IdTurno;
      this.myForm.controls['tipocambio'].setValue(oCaja.TurnoAbierto.TipoCambio);
      this.myForm.controls['fecha'].setValue(moment(new Date(oCaja.TurnoAbierto.FechaInicio)).format("DD/MM/YYYY HH:mm:ss"));
      this.myForm.controls['tipocambio'].disable();
      this.myForm.controls['fecha'].disable();
   
    } else {
      this.TurnoAbierto = false;
      this.myForm.controls['tipocambio'].setValue('');
      this.myForm.controls['fecha'].setValue(moment(this.today).format("DD/MM/YYYY HH:mm:ss"));
      this.myForm.controls['tipocambio'].enable();
      this.myForm.controls['fecha'].enable();
    }

  }

  async saveData() {
    try {
      if (this.myForm.valid) {
        this.spinnerService.show();
        var IdCaja: string = this.myForm.value.caja;
        var FechaTrabajo: string = moment(this.myForm.value.fecha, "DD/MM/YYYY").format("YYYY-MM-DD");
        var FechaInicio: string = moment(this.myForm.value.fecha, "DD/MM/YYYY HH:mm:ss").format();
        var Estado: number = 1;
        var TipoCambio: number = this.myForm.value.tipocambio;
        var TipoCambioVenta: number = this.myForm.value.tipocambio;
        var UsuReg: number = this.storageService.getCurrentSession().user.IdUsuario;
        var TurnoRestaurante: number = 1;

        var oTurno: Turno = new Turno(
          IdCaja, FechaTrabajo, FechaInicio, Estado, TipoCambio, TipoCambioVenta, UsuReg, TurnoRestaurante
        );
        // console.log(oTurno);
        
        var responseAbrirTurno: any = await this.TurnoService.AbrirTurno(oTurno).toPromise();
        if (responseAbrirTurno) {
          this.ListarCaja();
          this.ValidarTurnoAbierto(this.listCaja.find(x=> x.IdCaja==responseAbrirTurno.IdCaja));
        }
      }
    } catch (e) {
      Swal.fire(
        'Algo anda mal',
        e.error,
        'error'
      )
      console.log(e);

    } finally {
      this.spinnerService.hide();
    }

  }

}