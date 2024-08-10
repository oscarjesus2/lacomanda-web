import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { StorageService } from '../../services/storage.service';
import { Observacion } from '../../models/observacion.models';


@Component({
    selector: 'app-dialog-observacion',
    templateUrl: './dialog-observacion.component.html',
    styleUrls: ['./dialog-observacion.component.css']
})

export class DialogObservacionComponent {

    hide = true;

    public Observaciones: string = '';
    ListaObservacionComida: Observacion[];
    ListaObservacionBebida: Observacion[];;
    constructor(
        public dialogRef: MatDialogRef<DialogObservacionComponent>,
        private storageService: StorageService,
        @Inject(MAT_DIALOG_DATA) public data: DialogData) {  
            this.Observaciones= data.Observaciones;
            this.ListaObservacionComida= data.ListaObservacion.filter(x=> x.Tipo==='1');
            this.ListaObservacionBebida= data.ListaObservacion.filter(x=> x.Tipo==='2');
        }

    
    onNoClick(): void {
        this.data.Observaciones='';
        this.dialogRef.close();
    }
    

    onAgregarClick(): void {
      
    }

    agregarobservacion(oObservacion: Observacion): void{
        if (this.data.Observaciones==null) this.data.Observaciones='';
        this.data.Observaciones+=oObservacion.Descripcion+',';
    }
   
}

export interface DialogData {
    ListaObservacion: Observacion[],
    Observaciones: string,
    NombreCorto: string,
}

