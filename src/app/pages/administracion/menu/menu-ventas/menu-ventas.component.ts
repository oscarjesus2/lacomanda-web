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
import { ProductoComboMantenimientoComponent } from 'src/app/components/mantenimiento/producto-combo-mantenimiento/producto-combo-mantenimiento.component';
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
import { TarjetaMantenimientoComponent } from 'src/app/components/mantenimiento/tarjeta-mantenimiento/tarjeta-mantenimiento.component';
import { SocioNegocioMantenimientoComponent } from 'src/app/components/mantenimiento/socio-negocio-mantenimiento/socio-negocio-mantenimiento.component';
import { PromocionMantenimientoComponent } from 'src/app/components/mantenimiento/promocion-mantenimiento/promocion-mantenimiento.component';
import {
  EstadoLicenciaTenant,
  LicenciaTenantService,
} from 'src/app/services/licencia-tenant.service';
import {
  CARACTERISTICAS_LICENCIA as C,
  ExigenciaLicencia,
} from 'src/app/constants/caracteristicas-licencia';
import { ControlHorarioMantenimientoComponent } from 'src/app/components/mantenimiento/control-horario-mantenimiento/control-horario-mantenimiento.component';
import { ReporteVentasAnaliticoComponent } from 'src/app/components/mantenimiento/reporte-ventas-analitico/reporte-ventas-analitico.component';
import { TipoReporteVentas } from 'src/app/models/reportes-ventas.models';
import { ReservasMantenimientoComponent } from 'src/app/components/mantenimiento/reservas-mantenimiento/reservas-mantenimiento.component';
import { ReportesTermicosAdministracionComponent } from 'src/app/components/mantenimiento/reportes-termicos-administracion/reportes-termicos-administracion.component';
import { TipoReporteTermicoAdministracion } from 'src/app/models/reportes-termicos-administracion.models';
import { MonitorComandasComponent } from 'src/app/components/mantenimiento/monitor-comandas/monitor-comandas.component';

@Component({
  selector: 'app-menu-ventas',
  templateUrl: './menu-ventas.component.html'
})
export class MenuVentasComponent implements OnInit {
  readonly gruposReportes = [
    {
      clave: 'turno',
      titulo: 'Reportes de turno',
      descripcion: 'El mismo formato de Caja, preparado para ticket térmico.',
    },
    {
      clave: 'analisis',
      titulo: 'Análisis y gestión',
      descripcion: 'Indicadores y consultas para analizar la operación.',
    },
  ];

  /**
   * Hasta que `/licencia/me` responde no se muestra ninguna opción sujeta a
   * licencia: es preferible que aparezcan un instante después a que parpadeen y
   * desaparezcan, o a ofrecer algo que la API rechazará.
   */
  private estadoLicencia: EstadoLicenciaTenant = {
    licencia: null,
    sinSuscripcion: false,
    error: true,
    habilitadas: new Set<string>(),
  };

  ventasMenu = [
    {
      title: 'Maestros', titleKey: 'menuMasters',
      children: [
        { title: 'Configuración de Ambientes', route: '/ventas/configuracion-ambientes', icon: 'meeting_room',     label: 'Ambientes',    titleKey: 'zonesConfig',        labelKey: 'zones',              feature: C.VentasMesa      },
        { title: 'Configuración de Espacios',  route: '/ventas/configuracion-espacios',  icon: 'table_restaurant', label: 'Espacios',     titleKey: 'spacesConfig',       labelKey: 'spaces',             feature: C.VentasMesa      },
        { title: 'Familia de Productos',        route: '/ventas/familia-productos',        icon: 'category',         label: 'Familias',     titleKey: 'productFamilies',    labelKey: 'families',           feature: C.OperacionCaja   },
        { title: 'Sub Familia de Productos',    route: '/ventas/subfamilia-productos',     icon: 'account_tree',     label: 'Sub familias', titleKey: 'productSubfamilies', labelKey: 'subfamiliesShort',   feature: C.OperacionCaja   },
        { title: 'Grupos de Productos',         route: '/ventas/grupos',                   icon: 'inventory_2',      label: 'Grupos',       titleKey: 'productGroups',      labelKey: 'groups',             feature: C.OperacionCaja   },
        { title: 'Colores',                     route: '/ventas/colores',                  icon: 'palette',          label: 'Colores',      titleKey: 'colors',             labelKey: 'colors',             feature: C.OperacionCaja   },
        { title: 'Areas de Impresión',          route: '/ventas/area-impresion',           icon: 'print',            label: 'Impresión',    titleKey: 'printAreas',         labelKey: 'printing',           feature: C.OperacionCaja   },
        { title: 'Productos',                   route: '/ventas/productos',                icon: 'restaurant_menu',  label: 'Productos',    titleKey: 'products',           labelKey: 'products',           feature: C.OperacionCaja   },
        { title: 'Socios de Negocio',           route: '/ventas/socios-negocio',           icon: 'handshake',        label: 'Socios',       titleKey: 'businessPartners',   labelKey: 'partners',           feature: C.OperacionCaja   },
        { title: 'Configuración de menús',      route: '/ventas/configuracion-combos',     icon: 'tune',             label: 'Menús',        titleKey: 'combosConfig',       labelKey: 'combos',             feature: C.ProductosMenus  },
        { title: 'Observaciones',               route: '/ventas/observaciones',            icon: 'sticky_note_2',    label: 'Observac.',    titleKey: 'observations',       labelKey: 'observations',       feature: C.OperacionCaja   },
        { title: 'Empleados',                   route: '/ventas/empleados',                icon: 'badge',            label: 'Empleados',    titleKey: 'employees',          labelKey: 'employees'          },
        { title: 'Usuarios',                    route: '/ventas/usuarios',                 icon: 'manage_accounts',  label: 'Usuarios',     titleKey: 'users',              labelKey: 'users'              },
        { title: 'Caja',                        route: '/ventas/caja',                     icon: 'point_of_sale',    label: 'Caja',         titleKey: 'register',           labelKey: 'register',           feature: C.OperacionCaja   },
        { title: 'Estacion',                    route: '/ventas/estacion',                 icon: 'computer',         label: 'Estación',     titleKey: 'station',            labelKey: 'station'            },
        { title: 'Descuentos',                  route: '/ventas/descuentos',               icon: 'local_offer',      label: 'Descuentos',   titleKey: 'discounts',          labelKey: 'discounts',          feature: C.VentasDescuentos },
        { title: 'Tarjetas',                    route: '/ventas/tarjetas',                 icon: 'credit_card',      label: 'Tarjetas',     titleKey: 'cards',              labelKey: 'cards',              feature: C.OperacionCaja   },
        { title: 'Promociones',                 route: '/ventas/promociones',              icon: 'campaign',         label: 'Promociones',  titleKey: 'promotions',         labelKey: 'promotions',         feature: C.VentasPromociones },
        { title: 'Clientes',                    route: '/ventas/clientes',                 icon: 'people',           label: 'Clientes',     titleKey: 'customers',          labelKey: 'customers',          feature: C.OperacionCaja   },
      ]
    },
    {
      title: 'Operaciones', titleKey: 'menuOperations',
      children: [
        { title: 'Abrir Turno',      route: '/ventas/abrir-turno',        icon: 'lock_open',    label: 'Abrir turno',  titleKey: 'openShift',  labelKey: 'openShift',  feature: C.OperacionCaja },
        { title: 'Cerrar Turno',     route: '/ventas/cerrar-turno',       icon: 'lock',         label: 'Cerrar turno', titleKey: 'closeShift', labelKey: 'closeShift', feature: C.OperacionCaja },
        { title: 'Listado de Ventas',route: '/ventas/cerrar-turno',       icon: 'receipt_long', label: 'Ventas',       titleKey: 'salesList',  labelKey: 'sales',      feature: C.OperacionCaja },
        { title: 'Reservas online', route: '/ventas/reservas', icon: 'event_available', label: 'Reservas', feature: C.VentasReservasOnline }
      ]
    },
    {
      title: 'Reportes', titleKey: 'menuReports',
      children: [
        { title: 'Ventas por Producto', route: '/ventas/ventas-por-producto', icon: 'inventory_2', label: 'Ventas por producto', reporteTermico: 'ventas-producto', feature: C.OperacionReportes, grupoReporte: 'turno' },
        { title: 'Resumen de Ventas', route: '/ventas/resumen-ventas', icon: 'summarize', label: 'Resumen de ventas', reporteTermico: 'resumen-ventas', feature: C.OperacionReportes, grupoReporte: 'turno' },
        { title: 'Resumen de Documentos', route: '/ventas/resumen-documentos', icon: 'receipt_long', label: 'Resumen de documentos', reporteTermico: 'resumen-documentos', feature: C.OperacionReportes, grupoReporte: 'turno' },
        // MonitorComandasController apila las dos características, así que la
        // opción solo aparece cuando la licencia cubre ambas.
        { title: 'Trazabilidad de comandas', route: '/ventas/reportes/monitor-comandas', icon: 'account_tree', label: 'Monitor comandas', monitorComandas: true, feature: [C.OperacionReportes, C.ReportesSeguimientoComandas], grupoReporte: 'analisis' },
        { title: 'Contable',           route: '/ventas/contable',           icon: 'calculate',  label: 'Contable',     titleKey: 'accounting',     labelKey: 'accounting', grupoReporte: 'analisis' },
        { title: 'Productividad por empleado', route: '/ventas/reportes/productividad-empleados', icon: 'groups', label: 'Productividad', reporte: 'productividad-empleados', feature: C.OperacionReportes, grupoReporte: 'analisis' },
        { title: 'Espacios y servicio', route: '/ventas/reportes/mesas-servicio', icon: 'table_restaurant', label: 'Espacios y servicio', reporte: 'mesas-servicio', feature: C.OperacionReportes, grupoReporte: 'analisis' },
        { title: 'Productos sin rotación', route: '/ventas/reportes/productos-sin-rotacion', icon: 'inventory', label: 'Sin rotación', reporte: 'productos-sin-rotacion', feature: C.OperacionReportes, grupoReporte: 'analisis' },
        { title: 'Efectividad de descuentos', route: '/ventas/reportes/efectividad-descuentos', icon: 'percent', label: 'Descuentos', reporte: 'efectividad-descuentos', feature: C.OperacionReportes, grupoReporte: 'analisis' },
        { title: 'Clientes y recurrencia', route: '/ventas/reportes/clientes-recurrencia', icon: 'loyalty', label: 'Recurrencia', reporte: 'clientes-recurrencia', feature: C.OperacionReportes, grupoReporte: 'analisis' },
        { title: 'Incidencias operativas', route: '/ventas/reportes/incidencias-operativas', icon: 'report_problem', label: 'Incidencias', reporte: 'incidencias-operativas', feature: C.OperacionReportes, grupoReporte: 'analisis' },
        { title: 'Calidad documental', route: '/ventas/reportes/calidad-documental', icon: 'verified', label: 'Calidad docs.', reporte: 'calidad-documental', feature: C.OperacionReportes, grupoReporte: 'analisis' },
        { title: 'Control Horario',    route: '/ventas/control-horario',    icon: 'schedule',   label: 'Control horario', titleKey: 'timeTracking', labelKey: 'timeTracking', feature: C.PersonalControlHorario, grupoReporte: 'analisis' },
        { title: 'Incidencias de jornada', route: '/ventas/reportes/incidencias-jornada', icon: 'more_time', label: 'Incid. jornada', reporte: 'incidencias-jornada', feature: C.PersonalControlHorario, grupoReporte: 'analisis' }
      ]
    },
    {
      title: 'Configuracion', titleKey: 'menuConfiguration',
      children: [
        { title: 'Configuración Inicial',      route: '/ventas/config-inicial',  icon: 'settings',  label: 'Config. inicial', titleKey: 'initialSetup',          labelKey: 'initialSetupShort' },
        { title: 'Configurar esta estación',   route: '/ventas/config-estacion', icon: 'computer',  label: 'Esta estación',   titleKey: 'configureThisStation',  labelKey: 'thisStation'       }
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
    private licenciaTenantService: LicenciaTenantService,
  ) { }

  itemsVisibles(section: any): any[] {
    return section.children.filter((item: any) =>
      this.cubiertoPorLicencia(item.feature));
  }

  /** Una opción sin `feature` no está sujeta a licencia. */
  private cubiertoPorLicencia(feature?: ExigenciaLicencia): boolean {
    return (
      !feature ||
      this.licenciaTenantService.evaluar(this.estadoLicencia, feature)
    );
  }

  reportesVisibles(section: any, grupo: string): any[] {
    return this.itemsVisibles(section).filter(
      (item: any) => item.grupoReporte === grupo,
    );
  }

  openDialog(item: any): void {
    if (item.monitorComandas) {
      this.OpenMonitorComandasComponent();
      return;
    }
    if (item.reporteTermico) {
      this.OpenReporteTermicoAdministracion(
        item.reporteTermico as TipoReporteTermicoAdministracion,
      );
      return;
    }
    if (item.reporte) {
      this.OpenReporteVentasAnalitico(item.reporte as TipoReporteVentas);
      return;
    }
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
    if (item.route === '/ventas/configuracion-combos')
      {
        this.OpenProductoComboMantenimientoComponent();
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
    if (item.title === 'Reservas online')
    {
      this.OpenReservasMantenimientoComponent();
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
    if (item.title === 'Tarjetas')
    {
      this.OpenTarjetaMantenimientoComponent();
    }
    if (item.title === 'Promociones')
    {
      this.OpenPromocionMantenimientoComponent();
    }
    if (item.title === 'Control Horario')
    {
      this.OpenControlHorarioMantenimientoComponent();
    }
  }

  OpenReporteVentasAnalitico(tipo: TipoReporteVentas): void {
    this.dialog.open(ReporteVentasAnaliticoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: 'calc(100vw - 32px)',
      height: 'calc(100vh - 32px)',
      maxWidth: '1480px',
      maxHeight: '920px',
      panelClass: 'dialog-window--workspace',
      data: { tipo }
    });
  }

  OpenMonitorComandasComponent(): void {
    this.dialog.open(MonitorComandasComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: 'calc(100vw - 24px)',
      height: 'calc(100vh - 24px)',
      maxWidth: '1760px',
      maxHeight: '980px',
      panelClass: 'dialog-window--workspace',
    });
  }

  OpenReporteTermicoAdministracion(
    tipo: TipoReporteTermicoAdministracion,
  ): void {
    this.dialog.open(ReportesTermicosAdministracionComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: 'calc(100vw - 32px)',
      height: 'calc(100vh - 32px)',
      maxWidth: '1380px',
      maxHeight: '920px',
      panelClass: 'dialog-window--workspace',
      data: { tipo },
    });
  }

  OpenReservasMantenimientoComponent(): void {
    this.dialog.open(ReservasMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: 'calc(100vw - 32px)',
      height: 'calc(100vh - 32px)',
      maxWidth: '1380px',
      maxHeight: '920px',
      panelClass: 'dialog-window--workspace'
    });
  }

  OpenControlHorarioMantenimientoComponent(): void {
    this.dialog.open(ControlHorarioMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: 'calc(100vw - 32px)',
      height: 'calc(100vh - 32px)',
      maxWidth: '1320px',
      maxHeight: '900px',
      panelClass: 'dialog-window--workspace',
    });
  }

  OpenPromocionMantenimientoComponent(): void {
    this.dialog.open(PromocionMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: 'calc(100vw - 32px)',
      height: 'calc(100vh - 32px)',
      maxWidth: '1180px',
      maxHeight: '860px',
      panelClass: 'dialog-window--workspace'
    });
  }
  OpenCajaMantenimientoComponent() {
     const dialog = this.dialog.open(CajaMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px',
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
      // Sin alto fijo: el diálogo se ajusta al contenido (el surface ya limita
      // la altura al viewport) para evitar el scroll vertical innecesario.
    });
  }

  OpenObservacionesMantenimientoComponent() {
     const dialog = this.dialog.open(ObservacionMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px',
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

  OpenProductoComboMantenimientoComponent(): void {
    this.dialog.open(ProductoComboMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: 'calc(100vw - 32px)',
      height: 'calc(100vh - 32px)',
      maxWidth: '1180px',
      maxHeight: '860px',
      panelClass: 'dialog-window--workspace'
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
    });
  }

  OpenColorMantenimientoComponent(): void {
  
    const dialog = this.dialog.open(ColorMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px',
    });
  }


  OpenEspacioMantenimientoComponent(): void {
  
    const dialog = this.dialog.open(EspaciosMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px',
    });
  }

  OpenAmbienteMantenimientoComponent(): void {
  
    const dialog = this.dialog.open(AmbienteMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px',
    });
  }

  OpenFamiliaMantenimientoComponent(): void {
  
    const dialog = this.dialog.open(FamiliaMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '600px',
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
      data: { modoInicial: false },
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

  OpenTarjetaMantenimientoComponent(): void {
    this.dialog.open(TarjetaMantenimientoComponent, {
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
    this.licenciaTenantService
      .obtenerEstado()
      .subscribe(estado => (this.estadoLicencia = estado));
  }

}
