import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, LOCALE_ID, isDevMode } from '@angular/core';
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
import { DialogCerrarTurnoComponent } from './components/dialog-cerrar-turno/dialog-cerrar-turno.component';
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
import { DialogAnfitrionasComponent } from './components/dialog-anfitrionas/dialog-anfitrionas.component';


import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { TransaccionesDiariasComponent } from './pages/dashboard/transacciones-diarias/transacciones-diarias.component';
import { DialogEmitirVentaComponent } from './components/dialog-emitir-venta/dialog-emitir-venta.component';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { DialogReportecontableComponent } from './components/dialog-reportecontable/dialog-reportecontable.component';
import { QzTrayRequiredComponent } from './qz-tray-required/qz-tray-required.component';
import { ClienteMantenimientoComponent } from './components/mantenimiento/cliente-mantenimiento/cliente-mantenimiento.component';
import { EmpleadoMantenimientoComponent } from './components/mantenimiento/empleado-mantenimiento/empleado-mantenimiento.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { DialogComplementosComponent } from './components/dialog-complementos/dialog-complementos.component';
import { DialogMTextComponent } from './components/dialog-mtext/dialog-mtext.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { DialogProductSearchComponent } from './components/dialog-product-search/dialog-product-search.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { DialogDividirCuentaComponent } from './components/dialog-dividir-cuenta/dialog-dividir-cuenta.component';
import { DialogDescuentoComponent } from './components/dialog-descuento/dialog-descuento.component';
import { DialogEntradasComponent } from './components/dialog-entradas/dialog-entradas.component';
import { DialogPagarTaxistaComponent } from './components/dialog-pagar-taxista/dialog-pagar-taxista.component';
import { DialogDocumentosEmitidosComponent } from './components/dialog-documentos-emitidos/dialog-documentos-emitidos.component';
import { DialogCorregirVentaComponent } from './components/dialog-corregir-venta/dialog-corregir-venta.component';
import { UsuariosMantenimientoComponent } from './components/mantenimiento/usuarios-mantenimiento/usuarios-mantenimiento.component';
import { AnulacionesComponent } from './pages/dashboard/anulaciones/anulaciones.component';
import { EspaciosMantenimientoComponent } from './components/mantenimiento/espacios-mantenimiento/espacios-mantenimiento.component';
import { PosicionSelectorDialogComponent } from './components/posicion-selector-dialog/posicion-selector-dialog.component';
import { AmbienteMantenimientoComponent } from './components/mantenimiento/ambiente-mantenimiento/ambiente-mantenimiento.component';
import { ProductoMantenimientoComponent } from './components/mantenimiento/producto-mantenimiento/producto-mantenimiento.component';
import { ArticuloMantenimientoComponent } from './components/mantenimiento/articulo-mantenimiento/articulo-mantenimiento.component';
import { RecetaMantenimientoComponent } from './components/mantenimiento/receta-mantenimiento/receta-mantenimiento.component';
import { InventarioMantenimientoComponent } from './components/mantenimiento/inventario-mantenimiento/inventario-mantenimiento.component';
import { StockAlmacenConsultaComponent } from './components/mantenimiento/stock-almacen-consulta/stock-almacen-consulta.component';
import { KardexAlmacenConsultaComponent } from './components/mantenimiento/kardex-almacen-consulta/kardex-almacen-consulta.component';
import { ConsumoAreaReporteComponent } from './components/mantenimiento/consumo-area-reporte/consumo-area-reporte.component';
import { VentaCostoReporteComponent } from './components/mantenimiento/venta-costo-reporte/venta-costo-reporte.component';
import { ConsumoTeoricoRealReporteComponent } from './components/mantenimiento/consumo-teorico-real-reporte/consumo-teorico-real-reporte.component';
import { RentabilidadProductoCanalReporteComponent } from './components/mantenimiento/rentabilidad-producto-canal-reporte/rentabilidad-producto-canal-reporte.component';
import { CoberturaStockReporteComponent } from './components/mantenimiento/cobertura-stock-reporte/cobertura-stock-reporte.component';
import { AreaAlmacenMantenimientoComponent } from './components/mantenimiento/area-almacen-mantenimiento/area-almacen-mantenimiento.component';
import { SubAreaAlmacenMantenimientoComponent } from './components/mantenimiento/subarea-almacen-mantenimiento/subarea-almacen-mantenimiento.component';
import { EntradaCompraMantenimientoComponent } from './components/mantenimiento/entrada-compra-mantenimiento/entrada-compra-mantenimiento.component';
import { ProveedorMantenimientoComponent } from './components/mantenimiento/proveedor-mantenimiento/proveedor-mantenimiento.component';
import { ProductoComboMantenimientoComponent } from './components/mantenimiento/producto-combo-mantenimiento/producto-combo-mantenimiento.component';
import { FamiliaMantenimientoComponent } from './components/mantenimiento/familia-mantenimiento/familia-mantenimiento.component';
import { SubFamiliaMantenimientoComponent } from './components/mantenimiento/subfamilia-mantenimiento/subfamilia-mantenimiento.component';
import { GrupoMantenimientoComponent } from './components/mantenimiento/grupo-mantenimiento/grupo-mantenimiento.component';
import { ColorMantenimientoComponent } from './components/mantenimiento/color-mantenimiento/color-mantenimiento.component';
import { ConfiguracionInicialComponent } from './components/configuracion-inicial/configuracion-inicial/configuracion-inicial.component';
import { CajaMantenimientoComponent } from './components/mantenimiento/caja-mantenimiento/caja-mantenimiento.component';
import { CajaDocumentosDialogComponent } from './components/mantenimiento/caja-mantenimiento/caja-documentos-dialog/caja-documentos-dialog.component';
import { EstacionMantenimientoComponent } from './components/mantenimiento/estacion-mantenimiento/estacion-mantenimiento.component';
import { ObservacionMantenimientoComponent } from './components/mantenimiento/observacion-mantenimiento/observacion-mantenimiento.component';
import { ConfigurarOrdenadorComponent } from './components/configuracion-inicial/configurar-ordenador/configurar-ordenador.component';
import { AreaImpresionMantenimientoComponent } from './components/mantenimiento/area-impresion-mantenimiento/area-impresion-mantenimiento.component';
import { DialogReportesComponent } from './components/dialog-reportes/dialog-reportes.component';
import { DescuentoMantenimientoComponent } from './components/mantenimiento/descuento-mantenimiento/descuento-mantenimiento.component';
import { TarjetaMantenimientoComponent } from './components/mantenimiento/tarjeta-mantenimiento/tarjeta-mantenimiento.component';
import { DialogDeliveryComponent } from './components/dialog-delivery/dialog-delivery.component';
import { DialogMenuComponent } from './components/dialog-menu/dialog-menu.component';
import { SocioNegocioMantenimientoComponent } from './components/mantenimiento/socio-negocio-mantenimiento/socio-negocio-mantenimiento.component';
import { TenantTextPipe } from './pipes/tenant-text.pipe';
import { MesaClienteComponent } from './pages/mesa-cliente/mesa-cliente.component';
import { DialogSolicitudesMesaComponent } from './components/dialog-solicitudes-mesa/dialog-solicitudes-mesa.component';
import { SalidaInternaMantenimientoComponent } from './components/mantenimiento/salida-interna-mantenimiento/salida-interna-mantenimiento.component';
import { TransferenciaAlmacenMantenimientoComponent } from './components/mantenimiento/transferencia-almacen-mantenimiento/transferencia-almacen-mantenimiento.component';
import { PorcionamientoMantenimientoComponent } from './components/mantenimiento/porcionamiento-mantenimiento/porcionamiento-mantenimiento.component';
import { ProduccionMantenimientoComponent } from './components/mantenimiento/produccion-mantenimiento/produccion-mantenimiento.component';
import { PromocionMantenimientoComponent } from './components/mantenimiento/promocion-mantenimiento/promocion-mantenimiento.component';
import { MotivoSalidaMantenimientoComponent } from './components/mantenimiento/motivo-salida-mantenimiento/motivo-salida-mantenimiento.component';
import { GrupoAlmacenMantenimientoComponent } from './components/mantenimiento/grupo-almacen-mantenimiento/grupo-almacen-mantenimiento.component';
import { AsistenteEstacionComponent } from './components/asistente-estacion/asistente-estacion.component';
import { ComparativoVentasComponent } from './pages/dashboard/comparativo-ventas/comparativo-ventas.component';
import { EvolucionMargenComponent } from './pages/dashboard/evolucion-margen/evolucion-margen.component';
import { MetodosPagoDashboardComponent } from './pages/dashboard/metodos-pago-dashboard/metodos-pago-dashboard.component';
import { ControlHorarioComponent } from './components/control-horario/control-horario.component';
import { ControlHorarioMantenimientoComponent } from './components/mantenimiento/control-horario-mantenimiento/control-horario-mantenimiento.component';
import { ControlHorarioCorreccionComponent } from './components/mantenimiento/control-horario-correccion/control-horario-correccion.component';
import { ReporteVentasAnaliticoComponent } from './components/mantenimiento/reporte-ventas-analitico/reporte-ventas-analitico.component';
import { ReservasMantenimientoComponent } from './components/mantenimiento/reservas-mantenimiento/reservas-mantenimiento.component';
import { AgendaReservasComponent } from './components/reservas/agenda-reservas/agenda-reservas.component';
import { AgendaReservasDialogComponent } from './components/reservas/agenda-reservas-dialog/agenda-reservas-dialog.component';
import { ReservasOnlineComponent } from './pages/reservas-online/reservas-online.component';
import { ReportesTermicosAdministracionComponent } from './components/mantenimiento/reportes-termicos-administracion/reportes-termicos-administracion.component';
import { MonitorComandasComponent } from './components/mantenimiento/monitor-comandas/monitor-comandas.component';
import { SunatConfigurationComponent } from './components/mantenimiento/sunat-configuration/sunat-configuration.component';
import { PagoCuentaOnlineConfigurationComponent } from './components/mantenimiento/pago-cuenta-online-configuration/pago-cuenta-online-configuration.component';

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
    DialogCerrarTurnoComponent,
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
    DialogAnfitrionasComponent,
    TransaccionesDiariasComponent,
    DialogEmitirVentaComponent,
    DialogReportecontableComponent,
    QzTrayRequiredComponent,
    ClienteMantenimientoComponent,
    EmpleadoMantenimientoComponent,
    DialogComplementosComponent,
    DialogMTextComponent,
    DialogProductSearchComponent,
    DialogDividirCuentaComponent,
    DialogDescuentoComponent,
    DialogEntradasComponent,
    DialogPagarTaxistaComponent,
    DialogDocumentosEmitidosComponent,
    DialogCorregirVentaComponent,
    UsuariosMantenimientoComponent,
    AnulacionesComponent,
    EspaciosMantenimientoComponent,
    PosicionSelectorDialogComponent,
    AmbienteMantenimientoComponent,
    ProductoMantenimientoComponent,
    ArticuloMantenimientoComponent,
    RecetaMantenimientoComponent,
    InventarioMantenimientoComponent,
    StockAlmacenConsultaComponent,
    KardexAlmacenConsultaComponent,
    ConsumoAreaReporteComponent,
    VentaCostoReporteComponent,
    ConsumoTeoricoRealReporteComponent,
    RentabilidadProductoCanalReporteComponent,
    CoberturaStockReporteComponent,
    AreaAlmacenMantenimientoComponent,
    SubAreaAlmacenMantenimientoComponent,
    EntradaCompraMantenimientoComponent,
    ProveedorMantenimientoComponent,
    ProductoComboMantenimientoComponent,
    FamiliaMantenimientoComponent,
    SubFamiliaMantenimientoComponent,
    GrupoMantenimientoComponent,
    ColorMantenimientoComponent,
    ConfiguracionInicialComponent,
    CajaMantenimientoComponent,
    CajaDocumentosDialogComponent,
    EstacionMantenimientoComponent,
    ObservacionMantenimientoComponent,
    ConfigurarOrdenadorComponent,
    AreaImpresionMantenimientoComponent,
    DialogReportesComponent,
    DescuentoMantenimientoComponent,
    TarjetaMantenimientoComponent,
    DialogDeliveryComponent,
    DialogMenuComponent,
    SocioNegocioMantenimientoComponent,
    TenantTextPipe,
    MesaClienteComponent,
    DialogSolicitudesMesaComponent,
    SalidaInternaMantenimientoComponent,
    TransferenciaAlmacenMantenimientoComponent,
    PorcionamientoMantenimientoComponent,
    ProduccionMantenimientoComponent,
    PromocionMantenimientoComponent,
    MotivoSalidaMantenimientoComponent,
    GrupoAlmacenMantenimientoComponent,
    AsistenteEstacionComponent,
    ComparativoVentasComponent,
    EvolucionMargenComponent,
    MetodosPagoDashboardComponent,
    ControlHorarioComponent,
    ControlHorarioMantenimientoComponent,
    ControlHorarioCorreccionComponent,
    ReporteVentasAnaliticoComponent,
    ReservasMantenimientoComponent,
    AgendaReservasComponent,
    AgendaReservasDialogComponent,
    ReservasOnlineComponent,
    ReportesTermicosAdministracionComponent,
    MonitorComandasComponent,
    SunatConfigurationComponent,
    PagoCuentaOnlineConfigurationComponent,
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
    MatAutocompleteModule, 
    FontAwesomeModule, 
    MatSnackBarModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
  enabled: !isDevMode(),
  // Register the ServiceWorker as soon as the application is stable
  // or after 30 seconds (whichever comes first).
  registrationStrategy: 'registerWhenStable:30000'
})

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
