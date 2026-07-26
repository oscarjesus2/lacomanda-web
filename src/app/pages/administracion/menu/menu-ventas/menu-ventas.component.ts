import { Component, OnInit } from '@angular/core';
import { DialogTurnoComponent } from 'src/app/components/dialog-turno/dialog-turno.component';
import { DialogCerrarTurnoComponent } from 'src/app/components/dialog-cerrar-turno/dialog-cerrar-turno.component';
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
import { EspaciosMantenimientoComponent } from 'src/app/components/mantenimiento/espacios-mantenimiento/espacios-mantenimiento.component';
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
import { DescuentoMantenimientoComponent } from 'src/app/components/mantenimiento/descuento-mantenimiento/descuento-mantenimiento.component';
import { SocioNegocioMantenimientoComponent } from 'src/app/components/mantenimiento/socio-negocio-mantenimiento/socio-negocio-mantenimiento.component';

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
        { title: 'Configuración de Ambientes', route: '/ventas/configuracion-ambientes', icon: 'meeting_room',     label: 'Ambientes'    },
        { title: 'Configuración de Espacios',  route: '/ventas/configuracion-espacios',  icon: 'table_restaurant', label: 'Espacios'     },
        { title: 'Familia de Productos',        route: '/ventas/familia-productos',        icon: 'category',         label: 'Familias'     },
        { title: 'Sub Familia de Productos',    route: '/ventas/subfamilia-productos',     icon: 'account_tree',     label: 'Sub familias' },
        { title: 'Grupos de Productos',         route: '/ventas/grupos',                   icon: 'inventory_2',      label: 'Grupos'       },
        { title: 'Colores',                     route: '/ventas/colores',                  icon: 'palette',          label: 'Colores'      },
        { title: 'Areas de Impresión',          route: '/ventas/area-impresion',           icon: 'print',            label: 'Impresión'    },
        { title: 'Productos',                   route: '/ventas/productos',                icon: 'restaurant_menu',  label: 'Productos'    },
        { title: 'Socios de Negocio',           route: '/ventas/socios-negocio',           icon: 'handshake',        label: 'Socios'       },
        { title: 'Configuración de Combos',     route: '/ventas/configuracion-combos',     icon: 'tune',             label: 'Combos'       },
        { title: 'Observaciones',               route: '/ventas/observaciones',            icon: 'sticky_note_2',    label: 'Observac.'    },
        { title: 'Empleados',                   route: '/ventas/empleados',                icon: 'badge',            label: 'Empleados'    },
        { title: 'Usuarios',                    route: '/ventas/usuarios',                 icon: 'manage_accounts',  label: 'Usuarios'     },
        { title: 'Caja',                        route: '/ventas/caja',                     icon: 'point_of_sale',    label: 'Caja'         },
        { title: 'Estacion',                    route: '/ventas/estacion',                 icon: 'computer',         label: 'Estación'     },
        { title: 'Descuentos',                  route: '/ventas/descuentos',               icon: 'local_offer',      label: 'Descuentos'   },
        { title: 'Tarjetas',                    route: '/ventas/tarjetas',                 icon: 'credit_card',      label: 'Tarjetas'     },
        { title: 'Promociones',                 route: '/ventas/promociones',              icon: 'campaign',         label: 'Promociones'  },
        { title: 'Clientes',                    route: '/ventas/clientes',                 icon: 'people',           label: 'Clientes'     },
      ]
    },
    {
      title: 'Operaciones',
      children: [
        { title: 'Abrir Turno',      route: '/ventas/abrir-turno',        icon: 'lock_open',    label: 'Abrir turno'  },
        { title: 'Cerrar Turno',     route: '/ventas/cerrar-turno',       icon: 'lock',         label: 'Cerrar turno' },
        { title: 'Listado de Ventas',route: '/ventas/cerrar-turno',       icon: 'receipt_long', label: 'Ventas'       }
      ]
    },
    {
      title: 'Reportes',
      children: [
        { title: 'Contable',           route: '/ventas/contable',           icon: 'calculate',  label: 'Contable'    },
        { title: 'Ventas por Producto',route: '/ventas/ventas-por-producto',icon: 'bar_chart',  label: 'Por producto'},
        { title: 'Resumen de Ventas',  route: '/ventas/resumen-ventas',     icon: 'summarize',  label: 'Resumen'     },
        { title: 'Liquidación',        route: '/ventas/liquidacion',        icon: 'payments',   label: 'Liquidación' }
      ]
    },
    {
      title: 'Configuracion',
      children: [
        { title: 'Configuración Inicial',      route: '/ventas/config-inicial',  icon: 'settings',  label: 'Config. inicial' },
        { title: 'Configurar esta estación',   route: '/ventas/config-estacion', icon: 'computer',  label: 'Esta estación'   }
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
    if (item.title === 'Socios de Negocio')
      {
        this.OpenSocioNegocioMantenimientoComponent();
      }
    if (item.title === 'Configuración de Espacios') 
      {
        this.OpenEspacioMantenimientoComponent();
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
    if (item.title === 'Cerrar Turno')
    {
      this.OpenDialogCerrarTurno();
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
    if (item.title === 'Descuentos')
    {
      this.OpenDescuentoMantenimientoComponent();
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

    const dialog = this.dialog.open(DialogVentasgeneralesComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: 'calc(100vw - 32px)',
      height: 'calc(100vh - 32px)',
      maxWidth: '1400px',
      maxHeight: '900px',
      panelClass: 'dialog-window--workspace'
    });
  }

  OpenDialogReportecontableComponent(): void {
  
    const dialog = this.dialog.open(DialogReportecontableComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '600px', 
      // height: '410px', 
    });
  }

  OpenClienteMantenimientoComponent(): void {
  
    const dialog = this.dialog.open(ClienteMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px', 
      // height: '700px', 
    });
  }

  OpenGrupoMantenimientoComponent(): void {
  
    const dialog = this.dialog.open(GrupoMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px', 
      // height: '700px', 
    });
  }

  OpenProductoMantenimientoComponent(): void {
  
    const dialog = this.dialog.open(ProductoMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '1100px',
      maxWidth: '96vw',
    });
  }

  OpenSocioNegocioMantenimientoComponent(): void {
    this.dialog.open(SocioNegocioMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: 'calc(100vw - 32px)',
      height: 'calc(100vh - 32px)',
      maxWidth: '1100px',
      maxHeight: '820px',
    });
  }

  OpenEmpleadoMantenimientoComponent(): void {
  
    const dialog = this.dialog.open(EmpleadoMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px', 
      // height: '700px', 
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


  OpenEspacioMantenimientoComponent(): void {
  
    const dialog = this.dialog.open(EspaciosMantenimientoComponent, {
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
    });
  }

  OpenDialogTurno(): void {

    const dialogTurno = this.dialog.open(DialogTurnoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '560px',
      maxWidth: '95vw'
      // data: { oPedidoEspacio: listData, IdEspacio: IdEspacio, Espacio: this.espacioSelected.Descripcion + ' ' + this.espacioSelected.Numero}
    });
  }

  OpenDialogCerrarTurno(): void {
    this.dialog.open(DialogCerrarTurnoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '920px',
      maxWidth: '95vw',
    });
  }

   OpenConfiguracionInicialComponent(): void {

    const dialog = this.dialog.open(ConfiguracionInicialComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '920px',
    });
  }

  OpenDescuentoMantenimientoComponent(): void {
    this.dialog.open(DescuentoMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px',
      maxWidth: '96vw',
    });
  }

  OpenConfigurarEstaEstacionComponent(): void {
    const dialog = this.dialog.open(ConfigurarOrdenadorComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '700px', 
    });
  }

  ngOnInit(): void {
  }

}
