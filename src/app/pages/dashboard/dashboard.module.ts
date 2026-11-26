import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgxSpinnerModule } from 'ngx-spinner';

import { TenantTextPipe } from '../../pipes/tenant-text.pipe';
import { DashboardComponent } from './dashboard.component';
import { VentasDiariasComponent } from './ventas-diarias/ventas-diarias.component';
import { PopularidadPlatosComponent } from './popularidad-platos/popularidad-platos.component';
import { CanalVentaComponent } from './canal-venta/canal-venta.component';
import { HorasPicoComponent } from './horas-pico/horas-pico.component';
import { TransaccionesDiariasComponent } from './transacciones-diarias/transacciones-diarias.component';
import { AnulacionesComponent } from './anulaciones/anulaciones.component';
import { ComparativoVentasComponent } from './comparativo-ventas/comparativo-ventas.component';
import { EvolucionMargenComponent } from './evolucion-margen/evolucion-margen.component';
import { MetodosPagoDashboardComponent } from './metodos-pago-dashboard/metodos-pago-dashboard.component';

@NgModule({
  declarations: [
    DashboardComponent,
    VentasDiariasComponent,
    PopularidadPlatosComponent,
    CanalVentaComponent,
    HorasPicoComponent,
    TransaccionesDiariasComponent,
    AnulacionesComponent,
    ComparativoVentasComponent,
    EvolucionMargenComponent,
    MetodosPagoDashboardComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    NgxSpinnerModule,
    TenantTextPipe,
    RouterModule.forChild([{ path: '', component: DashboardComponent }]),
  ],
})
export class DashboardModule {}
