import { CanDeactivateFn } from '@angular/router';
import type { VentaComponent } from './venta.component';

export const puedeSalirDeVentaGuard: CanDeactivateFn<VentaComponent> = venta => venta.confirmarSalidaDeVenta();
