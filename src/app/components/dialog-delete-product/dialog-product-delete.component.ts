import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { LoginService as AuthServiceService } from '../../services/auth/login.service';
import { StorageService } from '../../services/storage.services';
import { NgxSpinnerService } from 'ngx-spinner';
import { User } from '../../models/user.models';
import Swal from 'sweetalert2/dist/sweetalert2';

@Component({
    selector: 'app-dialog-delete-product',
    templateUrl: './dialog-product-delete.component.html'
})
export class DialogDeleteProductComponent {

    public muestraAceptacion: Boolean = true;
    public muestraPedidoClave: Boolean = false;
    public muestraIngresoMotivo: Boolean = false;
    public clave: string = '';

    constructor(
        public dialogRef: MatDialogRef<DialogDeleteProductComponent>,
        @Inject(MAT_DIALOG_DATA) public data: DialogData, public authService: AuthServiceService,
        public storageService: StorageService, private spinnerService: NgxSpinnerService) {
        if (this.storageService.getCurrentSession().user.IdNivel == '001') {
            data.motivoAnulacion = 'Anulacion directa por el Administrador';
        }
    }

    public acepta(value: Boolean): void {
        var admin: string = '001';
        if (value) {
            if (this.storageService.getCurrentSession().user.IdNivel === admin) {
                this.data.confirmacion = true;
                this.dialogRef.close(this.data);
            } else {
                this.muestraAceptacion = false;
                this.muestraPedidoClave = true;
                this.muestraIngresoMotivo = false;
            }
        } else {
            this.dialogRef.close(this.data);
        }
    }

    async authenticar() {
        this.spinnerService.show();
        var vacio: string = '';

        if (this.clave !== vacio) {

            let username: string = '001';
            let clave = this.clave;

            var user: User = await this.authService.simpleLogin(username, clave).toPromise();
            if (user == null) {
                Swal.fire('Oops...', 'Contraseña incorrecta.', 'error')
                //alert('contraseña incorrecta');
            } else {
                this.muestraAceptacion = false;
                this.muestraPedidoClave = false;
                this.muestraIngresoMotivo = true;
            }
        } else {
            alert('ingrese clave');
        }
        this.spinnerService.hide();
    }

    public enviarAnulacion(): void {
        this.data.confirmacion = true;
        this.dialogRef.close(this.data);
    }
}

export interface DialogData {
    nombreProducto: string,
    motivoAnulacion: string,
    confirmacion: Boolean
}