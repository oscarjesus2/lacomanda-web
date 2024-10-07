import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { StorageService } from '../../services/storage.service';
import { Observacion } from '../../models/observacion.models';
import { DialogMTextComponent } from '../dialog-mtext/dialog-mtext.component';


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
        private dialog: MatDialog, // Añade el servicio MatDialog
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
        this.dialogRef.close(this.data);
    }

    onBorrarobservacion(): void{
        if (this.data.Observaciones != null && this.data.Observaciones.trim() !== '') {
            const observacionesArray = this.data.Observaciones.split(',').filter(obs => obs.trim() !== '');
            observacionesArray.pop();
            this.data.Observaciones = observacionesArray.join(',').trim();
            this.data.Observaciones = this.data.Observaciones.replace(/^,|,$/g, '');
        }
    }
   

    agregarobservacion(oObservacion: Observacion): void{
        if (this.data.Observaciones==null) this.data.Observaciones='';
        this.data.Observaciones+=oObservacion.Descripcion+',';
    }
   
    abrirTeclado(): void {
        const dialogRef = this.dialog.open(DialogMTextComponent, {
          width: '800px',
          data: { texto: '' } // Puedes pasar algún valor inicial si lo deseas
        });
    
        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            // Agrega el texto ingresado por el usuario a las observaciones
            this.data.Observaciones += result.value + ',';
          }
        });
      }
}

export interface DialogData {
    ListaObservacion: Observacion[],
    Observaciones: string,
    NombreCorto: string,
}

