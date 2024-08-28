import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, LOCALE_ID } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { CommonModule, DatePipe } from '@angular/common';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { LoginComponent } from './auth/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';


import { HttpClientModule } from '@angular/common/http';
import { JobBackendProvider } from './interceptor/angular.http.interceptor';

import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';

import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSliderModule } from '@angular/material/slider';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { DialogMozoComponent } from './components/dialog-mozo/dialog-mozo.component';
import { DialogDeleteProductComponent } from './components/dialog-delete-product/dialog-product-delete.component';
import { PedidosListComponent } from './components/pedidos-list/pedidos-list.component';
import { DialogEnviarPedidoComponent } from './components/dialog-grabar-pedido/dialog-grabar-pedido.component';
import { DialogVerPedidoComponent } from './components/dialog-ver-pedido/dialog-ver-pedido.component';
import { DialogObservacionComponent } from './components/dialog-observacion/dialog-observacion.component';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { VentaComponent } from './pages/venta/venta.component';
import { NgxSpinnerModule } from 'ngx-spinner';
import { DialogTurnoComponent } from './components/dialog-turno/dialog-turno.component';
import { HeaderComponent } from './shared/header/header.component';
import { VentasDiariasComponent } from './pages/dashboard/ventas-diarias/ventas-diarias.component';
import { PopularidadPlatosComponent } from './pages/dashboard/popularidad-platos/popularidad-platos.component';
import { CanalVentaComponent } from './pages/dashboard/canal-venta/canal-venta.component';
import { HorasPicoComponent } from './pages/dashboard/horas-pico/horas-pico.component';
import { MenuVentasComponent } from './pages/administracion/menu/menu-ventas/menu-ventas.component';
import { MenuAlmacenComponent } from './pages/administracion/menu/menu-almacen/menu-almacen.component';
import { AdministracionComponent } from './pages/administracion/administracion.component';
import { DialogVentasgeneralesComponent } from './components/dialog-ventasgenerales/dialog-ventasgenerales.component'; // Asumiendo que también tienes este componente importado


import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSortModule } from '@angular/material/sort';
import { DialogEmitirComprobanteComponent } from './components/dialog-emitir-comprobante/dialog-emitir-comprobante.component';
import { DialogMCantComponent } from './components/dialog-mcant/dialog-mcant.component';


import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { TransaccionesDiariasComponent } from './pages/dashboard/transacciones-diarias/transacciones-diarias.component';
import { DialogEmitirVentaComponent } from './components/dialog-emitir-venta/dialog-emitir-venta.component';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
<<<<<<< HEAD
import { PruebaComponent } from './components/prueba/prueba.component';
import { DialogReportecontableComponent } from './components/dialog-reportecontable/dialog-reportecontable.component';
=======
import { DialogReportecontableComponent } from './components/dialog-reportecontable/dialog-reportecontable.component';
import { QzTrayRequiredComponent } from './qz-tray-required/qz-tray-required.component';
import { ClienteMantenimientoComponent } from './components/mantenimiento/cliente-mantenimiento/cliente-mantenimiento.component';
>>>>>>> baf55da921f303e4c253134a43c0638b74959374

export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY'
  },
};

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent,

    DialogMozoComponent,
    DialogDeleteProductComponent,
    PedidosListComponent,
    DialogEnviarPedidoComponent,
    DialogVerPedidoComponent,
    DialogObservacionComponent,

    VentaComponent,
    DialogTurnoComponent,
    HeaderComponent,
    VentasDiariasComponent,
    PopularidadPlatosComponent,
    CanalVentaComponent,
    HorasPicoComponent,
    MenuVentasComponent,
    MenuAlmacenComponent,
    AdministracionComponent,
    DialogVentasgeneralesComponent,
    DialogEmitirComprobanteComponent,
    DialogMCantComponent,
    TransaccionesDiariasComponent,
    DialogEmitirVentaComponent,
<<<<<<< HEAD
    PruebaComponent,
    DialogReportecontableComponent,

=======
    DialogReportecontableComponent,
    QzTrayRequiredComponent,
    ClienteMantenimientoComponent,
    
>>>>>>> baf55da921f303e4c253134a43c0638b74959374
  ],
  imports: [
    CommonModule,
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatCheckboxModule,
    MatSortModule,
    //FlexLayoutModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatToolbarModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatTooltipModule,
    MatGridListModule,
    MatTableModule,
    MatPaginatorModule,
    MatRadioModule,
    MatSelectModule,
    MatDialogModule,
    NgxSpinnerModule,
    MatDividerModule,
    MatSliderModule,
    MatMenuModule,
    MatTabsModule,
    MatSlideToggleModule,
    MatSidenavModule,
    MatListModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatAutocompleteModule

  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA,
    NO_ERRORS_SCHEMA],
  providers: [
    JobBackendProvider,
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' },
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    DatePipe,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
