import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { VentaComponent } from './pages/venta/venta.component';
import { AdminGuard } from './guards/admin.guard';
import { RoleGuard } from './guards/role.guard';
import { LicenseGuard } from './guards/license.guard';
import { CARACTERISTICAS_LICENCIA } from './constants/caracteristicas-licencia';
import { AdministracionComponent } from './pages/administracion/administracion.component';
 
 // Importa los componentes de las sub-secciones
// import { GruposComponent } from './pages/ventas/grupos/grupos.component';
// import { ProductosComponent } from './pages/ventas/productos/productos.component';
// import { ClientesComponent } from './pages/ventas/clientes/clientes.component';
import { DialogTurnoComponent } from '../app/components/dialog-turno/dialog-turno.component';
import { QzTrayRequiredComponent } from './qz-tray-required/qz-tray-required.component';
import { MesaClienteComponent } from './pages/mesa-cliente/mesa-cliente.component';
import { ReservasOnlineComponent } from './pages/reservas-online/reservas-online.component';
// DigitacionMozoComponent reemplazado por VentaComponent con isModoMozo=true

// Importa más componentes según sea necesario...

const routes: Routes = [ 

  { path: 'mesa/:codigoQr', component: MesaClienteComponent },
  { path: 'reservas', component: ReservasOnlineComponent },
  { path: 'qz-tray-required', component: QzTrayRequiredComponent },
{
  path:'', redirectTo:'/dashboard', pathMatch:'full'
},
{
  path: 'dashboard',
  component: DashboardComponent,
  canActivate: [RoleGuard, LicenseGuard],
  data: {
    roles: ['admin'],
    feature: CARACTERISTICAS_LICENCIA.OperacionReportes
  }
},
{
  path: 'caja',
  component: VentaComponent,
  canActivate: [RoleGuard, LicenseGuard],
  data: {
    roles: ['admin', 'caja'],
    feature: CARACTERISTICAS_LICENCIA.OperacionCaja
  }
},
{
  path: 'mozo',
  component: VentaComponent,
  canActivate: [RoleGuard, LicenseGuard],
  data: {
    roles: ['admin', 'mozo'],
    feature: CARACTERISTICAS_LICENCIA.OperacionCaja
  }
},
{
  path: 'administracion',
  component: AdministracionComponent,
  canActivate: [RoleGuard],
  data: { roles: ['admin'] }
},
{
  path:'iniciar-sesion', 
  component:LoginComponent
},
{
  path:'inicio', 
  component:LoginComponent
},


   // Rutas para los menús de ventas
  //  { path: 'ventas/grupos', component: GruposComponent, canActivate: [AdminGuard] },
  //  { path: 'ventas/productos', component: ProductosComponent, canActivate: [AdminGuard] },
  //  { path: 'ventas/clientes', component: ClientesComponent, canActivate: [AdminGuard] },
  //  { path: 'administracion', component: DialogTurnoComponent, canActivate: [AdminGuard] },
   // Agrega más rutas para los otros componentes...
 
   // Rutas para los menús de almacén
   // { path: 'almacen/articulos', component: ArticulosComponent, canActivate: [AdminGuard] },
   // { path: 'almacen/recetas', component: RecetasComponent, canActivate: [AdminGuard] },
   // Agrega más rutas para los otros componentes de almacén...

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
