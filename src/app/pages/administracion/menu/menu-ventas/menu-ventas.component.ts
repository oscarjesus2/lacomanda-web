import { Component, OnInit } from '@angular/core';
import { DialogTurnoComponent } from 'src/app/components/dialog-turno/dialog-turno.component';
import { DialogVentasgeneralesComponent } from 'src/app/components/dialog-ventasgenerales/dialog-ventasgenerales.component';
import { MatDialog } from '@angular/material/dialog';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { LoginService } from 'src/app/services/auth/login.service';
import { StorageService } from 'src/app/services/storage.service';
import { DataService } from 'src/app/services/data.service';
import { TurnoService } from 'src/app/services/turno.service';
import { DialogReportecontableComponent } from 'src/app/components/dialog-reportecontable/dialog-reportecontable.component';
import { ClienteMantenimientoComponent } from 'src/app/components/mantenimiento/cliente-mantenimiento/cliente-mantenimiento.component';
import { EmpleadoMantenimientoComponent } from 'src/app/components/mantenimiento/empleado-mantenimiento/empleado-mantenimiento.component';
import { UsuariosMantenimientoComponent } from 'src/app/components/mantenimiento/usuarios-mantenimiento/usuarios-mantenimiento.component';
import { MesasMantenimientoComponent } from 'src/app/components/mantenimiento/mesas-mantenimiento/mesas-mantenimiento.component';
import { AmbienteMantenimientoComponent } from 'src/app/components/mantenimiento/ambiente-mantenimiento/ambiente-mantenimiento.component';
import { ProductoMantenimientoComponent } from 'src/app/components/mantenimiento/producto-mantenimiento/producto-mantenimiento.component';
import { FamiliaMantenimientoComponent } from 'src/app/components/mantenimiento/familia-mantenimiento/familia-mantenimiento.component';
import { SubFamiliaMantenimientoComponent } from 'src/app/components/mantenimiento/subfamilia-mantenimiento/subfamilia-mantenimiento.component';
import { ColorMantenimientoComponent } from 'src/app/components/mantenimiento/color-mantenimiento/color-mantenimiento.component';
import { GrupoMantenimientoComponent } from 'src/app/components/mantenimiento/grupo-mantenimiento/grupo-mantenimiento.component';
import { CajaMantenimientoComponent } from 'src/app/components/mantenimiento/caja-mantenimiento/caja-mantenimiento.component';
import { EstacionMantenimientoComponent } from 'src/app/components/mantenimiento/estacion-mantenimiento/estacion-mantenimiento.component';
import { ObservacionMantenimientoComponent } from 'src/app/components/mantenimiento/observacion-mantenimiento/observacion-mantenimiento.component';
import { ConfiguracionInicialComponent } from 'src/app/components/configuracion-inicial/configuracion-inicial/configuracion-inicial.component';
import { ConfigurarOrdenadorComponent } from 'src/app/components/configuracion-inicial/configurar-ordenador/configurar-ordenador.component';
import { AreaImpresionMantenimientoComponent } from 'src/app/components/mantenimiento/area-impresion-mantenimiento/area-impresion-mantenimiento.component';

@Component({
  selector: 'app-menu-ventas',
  templateUrl: './menu-ventas.component.html',
  styleUrls: ['./menu-ventas.component.css']
})
export class MenuVentasComponent implements OnInit {

  ventasMenu = [
    {
      title: 'Maestros',
      children: [
        { title: 'Configuración de Ambientes', route: '/ventas/configuracion-ambientes' },
        { title: 'Configuración de Espacios', route: '/ventas/configuracion-espacios' },
        { title: 'Familia de Productos', route: '/ventas/familia-productos' },
        { title: 'Sub Familia de Productos', route: '/ventas/subfamilia-productos' },
        { title: 'Grupos de Productos', route: '/ventas/grupos' },
        { title: 'Colores', route: '/ventas/colores' },
        { title: 'Areas de Impresión', route: '/ventas/area-impresion' },
        { title: 'Productos', route: '/ventas/productos' },
        { title: 'Socios de Negocio', route: '/ventas/socios-negocio' },
        { title: 'Configuración de Combos', route: '/ventas/configuracion-combos' },
        { title: 'Observaciones', route: '/ventas/observaciones' },
        { title: 'Empleados', route: '/ventas/empleados' },
        { title: 'Usuarios', route: '/ventas/usuarios' },
        { title: 'Caja', route: '/ventas/caja' },
        { title: 'Estacion', route: '/ventas/estacion' },
        { title: 'Descuentos', route: '/ventas/descuentos' },
        { title: 'Tarjetas', route: '/ventas/tarjetas' },
        { title: 'Promociones', route: '/ventas/promociones' },
        { title: 'Clientes', route: '/ventas/clientes' },
      ]
    },
    {
      title: 'Operaciones',
      children: [
        { title: 'Abrir Turno', route: '/ventas/abrir-turno' },
        { title: 'Cerrar Turno', route: '/ventas/cerrar-turno' },
        { title: 'Listado de Ventas', route: '/ventas/cerrar-turno' }
      ]
    },
    {
      title: 'Reportes',
      children: [
        { title: 'Contable', route: '/ventas/contable' },
        { title: 'Ventas por Producto', route: '/ventas/ventas-por-producto' },
        { title: 'Resumen de Ventas', route: '/ventas/resumen-ventas' },
        { title: 'Liquidación', route: '/ventas/liquidacion' }
      ]
    },
    {
      title: 'Configuracion',
      children: [
        { title: 'Configuración Inicial', route: '/ventas/config-inicial' },
        { title: 'Configurar esta estación', route: '/ventas/config-estacion' }
      ]
    }
  ];

  constructor(public dialog: MatDialog,
    private spinnerService: NgxSpinnerService,
    private router: Router,
    private loginService: LoginService,
    private storageService: StorageService,
    private TurnoService: TurnoService,
    private dataService: DataService,
  ) { }

  openDialog(item: any): void {
    if (item.title === 'Colores') 
      {
        this.OpenColorMantenimientoComponent();
      } 
    if (item.title === 'Clientes') 
      {
        this.OpenClienteMantenimientoComponent();
      } 
    if (item.title === 'Empleados') 
      {
        this.OpenEmpleadoMantenimientoComponent();
      } 
    if (item.title === 'Grupos de Productos') 
      {
        this.OpenGrupoMantenimientoComponent();
      } 
    if (item.title === 'Usuarios') 
      {
        this.OpenUsuarioMantenimientoComponent();
      }
    if (item.title === 'Areas de Impresión') 
      {
        this.OpenAreasImpresionMantenimientoComponent();
      } 
    if (item.title === 'Productos') 
      {
        this.OpenProductoMantenimientoComponent();
      } 
    if (item.title === 'Configuración de Espacios') 
      {
        this.OpenMesaMantenimientoComponent();
      }
    if (item.title === 'Familia de Productos') 
      {
        this.OpenFamiliaMantenimientoComponent();
      }
    if (item.title === 'Sub Familia de Productos') 
      {
        this.OpenSubFamiliaMantenimientoComponent();
      }
    if (item.title === 'Configuración de Ambientes') 
      {
        this.OpenAmbienteMantenimientoComponent();
      } 
    if (item.title === 'Caja') 
    {
      this.OpenCajaMantenimientoComponent();
    }
    if (item.title === 'Estacion') 
    {
      this.OpenEstacionesMantenimientoComponent();
    }
    if (item.title === 'Observaciones') 
    {
      this.OpenObservacionesMantenimientoComponent();
    }
    if (item.title === 'Abrir Turno') 
    {
      this.OpenDialogTurno();
    } 
    if (item.title === 'Listado de Ventas') 
    {
      this.OpenDialogVentasGeneralesTurno();
    }
    if (item.title === 'Contable') 
    {
      this.OpenDialogReportecontableComponent();
    }

    if (item.title === 'Configuración Inicial') 
    {
      this.OpenConfiguracionInicialComponent();
    }

    if (item.title === 'Configurar esta estación') 
    {
      this.OpenConfigurarEstaEstacionComponent();
    }
  }
  OpenCajaMantenimientoComponent() {
     const dialog = this.dialog.open(CajaMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px', 
      height: '500px', 
    });
  }

  OpenEstacionesMantenimientoComponent() {
     const dialog = this.dialog.open(EstacionMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px', 
      height: '500px', 
    });
  }

  OpenAreasImpresionMantenimientoComponent() {
     const dialog = this.dialog.open(AreaImpresionMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px', 
      height: '500px', 
    });
  }

  OpenObservacionesMantenimientoComponent() {
     const dialog = this.dialog.open(ObservacionMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px', 
      height: '500px', 
    });
  }

  OpenDialogVentasGeneralesTurno(): void {

    const dialogTurno = this.dialog.open(DialogVentasgeneralesComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '100vw',  
      height: '100vh', 
      maxWidth: '100vw',
      maxHeight: '100vh'
    });
  }

  OpenDialogReportecontableComponent(): void {
  
    const dialog = this.dialog.open(DialogReportecontableComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '600px', 
      height: '410px', 
    });
  }

  OpenClienteMantenimientoComponent(): void {
  
    const dialog = this.dialog.open(ClienteMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px', 
      height: '700px', 
    });
  }

  OpenGrupoMantenimientoComponent(): void {
  
    const dialog = this.dialog.open(GrupoMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px', 
      height: '700px', 
    });
  }

  OpenProductoMantenimientoComponent(): void {
  
    const dialog = this.dialog.open(ProductoMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px', 
      height: '700px', 
    });
  }

  OpenEmpleadoMantenimientoComponent(): void {
  
    const dialog = this.dialog.open(EmpleadoMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px', 
      height: '700px', 
    });
  }

  OpenUsuarioMantenimientoComponent(): void {
  
    const dialog = this.dialog.open(UsuariosMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px', 
      height: '700px', 
    });
  }

  OpenColorMantenimientoComponent(): void {
  
    const dialog = this.dialog.open(ColorMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px', 
      height: '700px', 
    });
  }


  OpenMesaMantenimientoComponent(): void {
  
    const dialog = this.dialog.open(MesasMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px', 
      height: '700px', 
    });
  }

  OpenAmbienteMantenimientoComponent(): void {
  
    const dialog = this.dialog.open(AmbienteMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px', 
      height: '700px', 
    });
  }

  OpenFamiliaMantenimientoComponent(): void {
  
    const dialog = this.dialog.open(FamiliaMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '600px', 
      height: '700px', 
    });
  }

  OpenSubFamiliaMantenimientoComponent(): void {
  
    const dialog = this.dialog.open(SubFamiliaMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '600px', 
      height: '700px', 
    });
  }

  OpenDialogTurno(): void {

    const dialogTurno = this.dialog.open(DialogTurnoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '600px', height: '400px'
      // data: { oPedidoMesa: listData, IdMesa: IdMesa, Mesa: this.mesaSelected.Descripcion + ' ' + this.mesaSelected.Numero}
    });
  }

   OpenConfiguracionInicialComponent(): void {

    const dialog = this.dialog.open(ConfiguracionInicialComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '920px'
    });
  }

  OpenConfigurarEstaEstacionComponent(): void {
    const dialog = this.dialog.open(ConfigurarOrdenadorComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '700px', 
      height: '600px', 
    });
  }

  ngOnInit(): void {
  }

}