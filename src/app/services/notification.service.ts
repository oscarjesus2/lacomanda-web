import { Injectable } from '@angular/core';
import Swal from 'sweetalert2/dist/sweetalert2.js';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {

    showError(message: string): void {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message,
            confirmButtonText: 'Close'
        });
    }

    showSuccess(message: string): void {
        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: message,
            confirmButtonText: 'Close'
        });
    }

    showWarning(message: string): void {
        Swal.fire('Advertencia', message, 'warning');
      }
    // Puedes agregar más métodos según sea necesario (info, warning, etc.)
}
