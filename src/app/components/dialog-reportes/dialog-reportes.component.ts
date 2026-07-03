import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NgxSpinnerService } from 'ngx-spinner';
import { lastValueFrom } from 'rxjs';
import { ResumenCobrosDTO } from 'src/app/interfaces/resumenCobrosDTO.interface';
import { Configuracion } from 'src/app/models/configuracion.models';
import { TurnoService } from 'src/app/services/turno.service';

export interface DialogReportesData {
  idTurno: number;
  config: Configuracion | null;
}

@Component({
  selector: 'app-dialog-reportes',
  templateUrl: './dialog-reportes.component.html',
  styleUrls: ['./dialog-reportes.component.css']
})
export class DialogReportesComponent implements OnInit {

  idTurno: number;
  config: Configuracion | null;
  resumen: ResumenCobrosDTO | null = null;
  loadingResumen = false;

  constructor(
    public dialogRef: MatDialogRef<DialogReportesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogReportesData,
    private turnoService: TurnoService,
    private spinnerService: NgxSpinnerService
  ) {
    this.idTurno = data.idTurno;
    this.config = data.config;
  }

  ngOnInit(): void {
    this.loadResumen();
  }

  async loadResumen(): Promise<void> {
    this.loadingResumen = true;
    try {
      const response = await lastValueFrom(this.turnoService.GetResumenCobros(this.idTurno));
      if (response.Success) {
        this.resumen = response.Data;
      }
    } catch (e) {
      console.error('Error al cargar resumen de cobros', e);
    } finally {
      this.loadingResumen = false;
    }
  }

  get simbolo(): string {
    return this.config?.SimboloMoneda || 'S/';
  }

  close(): void {
    this.dialogRef.close();
  }
}
