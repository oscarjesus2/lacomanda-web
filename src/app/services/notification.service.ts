import { Injectable } from '@angular/core';
import { Notificar } from '../shared/notificaciones';
import { TenantTextCatalogService } from './localization/tenant-text-catalog.service';

/**
 * Fachada inyectable sobre {@link Notificar}.
 *
 * Existía antes con sus propios `Swal.fire`, y por eso el éxito salía como
 * modal con botón "Close" y con los títulos escritos en inglés. Ahora delega,
 * de modo que haya una sola definición de cómo se avisa al usuario: si mañana
 * cambia la forma del toast, cambia en un único sitio.
 */
@Injectable({
    providedIn: 'root'
})
export class NotificationService {

    constructor(private readonly textCatalog: TenantTextCatalogService) {}

    showError(message: string): void {
        void Notificar.error(this.textCatalog.get('error'), message);
    }

    /** Resultado correcto: toast, nunca un modal que haya que cerrar. */
    showSuccess(message: string): void {
        Notificar.exito(this.textCatalog.get('saved'), message);
    }

    showWarning(message: string): void {
        void Notificar.advertencia(this.textCatalog.get('validation'), message);
    }
}
