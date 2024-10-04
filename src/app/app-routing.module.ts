import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { VentaComponent } from './pages/venta/venta.component';
import { AdminGuard } from './guards/admin.guard';
import { AdministracionComponent } from './pages/administracion/administracion.component';
 
 // Importa los componentes de las sub-secciones
// import { GruposComponent } from './pages/ventas/grupos/grupos.component';
// import { ProductosComponent } from './pages/ventas/productos/productos.component';
// import { ClientesComponent } from './pages/ventas/clientes/clientes.component';
import { DialogTurnoComponent } from '../app/components/dialog-turno/dialog-turno.component';
import { QzTrayRequiredComponent } from './qz-tray-required/qz-tray-required.component';
import { DigitacionMozoComponent } from './pages/digitacion-mozo/digitacion-mozo.component';

// Importa más componentes según sea necesario...

const routes: Routes = [ 

  { path: 'qz-tray-required', component: QzTrayRequiredComponent },
{
  path:'', redirectTo:'/dashboard', pathMatch:'full'
},
{
  path:'dashboard', 
  component:DashboardComponent,
  canActivate: [AdminGuard]
},
{
  path:'caja',  
  component:VentaComponent,
  canActivate: [AdminGuard]
},
{
  path:'mozo',  
  component:DigitacionMozoComponent,
  canActivate: [AdminGuard]
},
{
  path:'administracion', 
  component:AdministracionComponent,
  canActivate: [AdminGuard]
},
{
  path:'iniciar-sesion', 
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
