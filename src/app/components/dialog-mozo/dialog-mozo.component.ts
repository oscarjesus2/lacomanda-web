import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {MatDialogModule} from '@angular/material/dialog';
import { Empleado } from '../../models/empleado.models';
import { StorageService } from '../../services/storage.service';
 
@Component({
    selector: 'app-dialog-mozo',
    templateUrl: './dialog-mozo.component.html',
    styleUrls: ['./dialog-mozo.component.css']
})

export class DialogMozoComponent {

    hide = true;

    public NroPersonas: string = '';
    public CodigoMozo: string ='';
    public sFocus:string='';
    constructor(
        public dialogRef: MatDialogRef<DialogMozoComponent>,
        private storageService: StorageService,
        @Inject(MAT_DIALOG_DATA) public data: DialogData) {  
        }

    
    onNoClick(): void {
        this.dialogRef.close();
    }
    

    onAgregarClick(): void {
        this.data.IdEmpleado=this.storageService.getCurrentSession().User.IdEmpleado;
        this.data.NroPersonas= this.NroPersonas;
    }
    // onItemClick(item:any) {
      
    //     if (item=='Limpiar'){

    //         if (this.sFocus=='NroPersonas'){
    //             this.NroPersonas='';
    //         }
    //         if (this.sFocus=='CodigoMozo'){
    //             this.CodigoMozo='';
    //             this.data.IdEmpleado='';
    //         }
       
    //     }else{
    //         if (this.sFocus=='NroPersonas'){
    //             this.NroPersonas+=item;
    //         }
    //         if (this.sFocus=='CodigoMozo'){
    //             this.CodigoMozo+=item;
    //             this.data.IdEmpleado=this.getEmpleadoByCodigoMozo(this.CodigoMozo).IdEmpleado;
    //         }
    //     }
    // }

    onsetFocus(item:any) {
        this.sFocus=item;
    }


    // private getEmpleadoByCodigoMozo(CodigoMozo: string): Empleado {
    //     let result: Empleado;
    //     this.data.listMozos.forEach(Mozo => {
    //       if (CodigoMozo === Mozo.CodigoMozo) {
    //         result = Mozo;
    //       }
    //     });
    
    //     return result;
    //   }
}

export interface DialogData {
    listMozos: Empleado[],
    IdEmpleado: string,
    NroPersonas: string,
    NumMesa: string;
}

