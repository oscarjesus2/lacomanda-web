import { Component, OnInit } from '@angular/core';
import { ComponentType } from '@angular/cdk/portal';
import { MatDialog } from '@angular/material/dialog';
import { AreaAlmacenMantenimientoComponent } from 'src/app/components/mantenimiento/area-almacen-mantenimiento/area-almacen-mantenimiento.component';
import { ArticuloMantenimientoComponent } from 'src/app/components/mantenimiento/articulo-mantenimiento/articulo-mantenimiento.component';
import { InventarioMantenimientoComponent } from 'src/app/components/mantenimiento/inventario-mantenimiento/inventario-mantenimiento.component';
import { RecetaMantenimientoComponent } from 'src/app/components/mantenimiento/receta-mantenimiento/receta-mantenimiento.component';
import { SubAreaAlmacenMantenimientoComponent } from 'src/app/components/mantenimiento/subarea-almacen-mantenimiento/subarea-almacen-mantenimiento.component';
import { EntradaCompraMantenimientoComponent } from 'src/app/components/mantenimiento/entrada-compra-mantenimiento/entrada-compra-mantenimiento.component';
import { ProveedorMantenimientoComponent } from 'src/app/components/mantenimiento/proveedor-mantenimiento/proveedor-mantenimiento.component';
import { SalidaInternaMantenimientoComponent } from 'src/app/components/mantenimiento/salida-interna-mantenimiento/salida-interna-mantenimiento.component';
import { TransferenciaAlmacenMantenimientoComponent } from 'src/app/components/mantenimiento/transferencia-almacen-mantenimiento/transferencia-almacen-mantenimiento.component';
import { PorcionamientoMantenimientoComponent } from 'src/app/components/mantenimiento/porcionamiento-mantenimiento/porcionamiento-mantenimiento.component';
import { ProduccionMantenimientoComponent } from 'src/app/components/mantenimiento/produccion-mantenimiento/produccion-mantenimiento.component';
import { MotivoSalidaMantenimientoComponent } from 'src/app/components/mantenimiento/motivo-salida-mantenimiento/motivo-salida-mantenimiento.component';
import { GrupoAlmacenMantenimientoComponent } from 'src/app/components/mantenimiento/grupo-almacen-mantenimiento/grupo-almacen-mantenimiento.component';
import { StockAlmacenConsultaComponent } from 'src/app/components/mantenimiento/stock-almacen-consulta/stock-almacen-consulta.component';
import { KardexAlmacenConsultaComponent } from 'src/app/components/mantenimiento/kardex-almacen-consulta/kardex-almacen-consulta.component';
import { ConsumoAreaReporteComponent } from 'src/app/components/mantenimiento/consumo-area-reporte/consumo-area-reporte.component';
import { VentaCostoReporteComponent } from 'src/app/components/mantenimiento/venta-costo-reporte/venta-costo-reporte.component';
import { ConsumoTeoricoRealReporteComponent } from 'src/app/components/mantenimiento/consumo-teorico-real-reporte/consumo-teorico-real-reporte.component';
import { RentabilidadProductoCanalReporteComponent } from 'src/app/components/mantenimiento/rentabilidad-producto-canal-reporte/rentabilidad-producto-canal-reporte.component';
import { CoberturaStockReporteComponent } from 'src/app/components/mantenimiento/cobertura-stock-reporte/cobertura-stock-reporte.component';
import {
  EstadoLicenciaTenant,
  LicenciaTenantService,
} from 'src/app/services/licencia-tenant.service';
import {
  CARACTERISTICAS_LICENCIA as C,
  ExigenciaLicencia,
} from 'src/app/constants/caracteristicas-licencia';

@Component({
  selector: 'app-menu-almacen',
  templateUrl: './menu-almacen.component.html'
})
export class MenuAlmacenComponent implements OnInit {
  /**
   * Hasta que `/licencia/me` responde no se muestra nada sujeto a licencia,
   * para no ofrecer opciones que la API rechazaría con 403.
   */
  private estadoLicencia: EstadoLicenciaTenant = {
    licencia: null,
    sinSuscripcion: false,
    error: true,
    habilitadas: new Set<string>(),
  };

  almacenMenu: any[] = [
    {
      title: 'Maestros',
      titleKey: 'menuMasters',
      labelKey: 'menuMasters',
      icon: 'inventory',
      children: [
        {
          title: 'Artículos',
          action: 'articulos',
          feature: C.AlmacenGestion,
          icon: 'inventory',
          label: 'Artículos',
          titleKey: 'items',
          labelKey: 'items',
          disabled: false
        },
        {
          title: 'Recetas',
          action: 'recetas',
          feature: C.AlmacenRecetas,
          icon: 'menu_book',
          label: 'Recetas',
          titleKey: 'recipes',
          labelKey: 'recipes',
          disabled: false
        },
        {
          title: 'Áreas de almacén',
          action: 'areasAlmacen',
          feature: C.AlmacenGestion,
          icon: 'warehouse',
          label: 'Áreas de almacén',
          titleKey: 'warehouseAreas',
          labelKey: 'warehouseAreas',
          disabled: false
        },
        {
          title: 'Subáreas de almacén',
          action: 'subareasAlmacen',
          feature: C.AlmacenGestion,
          icon: 'account_tree',
          label: 'Subáreas de almacén',
          titleKey: 'warehouseSubareas',
          labelKey: 'warehouseSubareas',
          disabled: false
        },
        {
          title: 'Proveedores',
          action: 'proveedores',
          feature: C.AlmacenCompras,
          icon: 'local_shipping',
          label: 'Proveedores',
          titleKey: 'suppliers',
          labelKey: 'suppliers',
          disabled: false
        },
        {
          title: 'Motivos de salida',
          action: 'motivosSalida',
          feature: C.AlmacenGestion,
          icon: 'assignment_late',
          label: 'Motivos salida',
          titleKey: 'stockOutReasons',
          labelKey: 'stockOutReasons',
          disabled: false
        },
        {
          title: 'Grupos de almacén',
          action: 'gruposAlmacen',
          feature: C.AlmacenGestion,
          icon: 'category',
          label: 'Grupos',
          titleKey: 'warehouseGroups',
          labelKey: 'groups',
          disabled: false
        }
      ]
    },
    {
      title: 'Movimientos',
      titleKey: 'menuWarehouseMovements',
      children: [
        {
          title: 'Ingresos',
          action: 'ingresosCompra',
          feature: C.AlmacenCompras,
          icon: 'move_to_inbox',
          label: 'Ingresos',
          titleKey: 'stockIn',
          labelKey: 'stockIn',
          disabled: false
        },
        {
          title: 'Salidas',
          action: 'salidasInternas',
          feature: C.AlmacenGestion,
          icon: 'outbox',
          label: 'Salidas',
          titleKey: 'stockOut',
          labelKey: 'stockOut',
          disabled: false
        },
        {
          title: 'Transferencias',
          action: 'transferenciasAlmacen',
          feature: C.AlmacenGestion,
          icon: 'swap_horiz',
          label: 'Transferencias',
          titleKey: 'transfers',
          labelKey: 'transfers',
          disabled: false
        }
      ]
    },
    {
      title: 'Control de inventario',
      titleKey: 'menuInventoryControl',
      children: [
        {
          title: 'Inventarios',
          action: 'inventarios',
          feature: C.AlmacenInventarios,
          icon: 'fact_check',
          label: 'Inventarios',
          titleKey: 'inventories',
          labelKey: 'inventories',
          disabled: false
        },
        {
          title: 'Stock por área',
          action: 'stockPorArea',
          feature: C.AlmacenKardex,
          icon: 'query_stats',
          label: 'Stock por área',
          titleKey: 'stockByArea',
          labelKey: 'stockByArea',
          disabled: false
        },
        {
          title: 'Kardex',
          action: 'kardexAlmacen',
          feature: C.AlmacenKardex,
          icon: 'receipt_long',
          label: 'Kardex',
          titleKey: 'warehouseKardex',
          labelKey: 'warehouseKardex',
          disabled: false
        }
      ]
    },
    {
      title: 'Transformación',
      titleKey: 'menuWarehouseTransformation',
      children: [
        {
          title: 'Porcionamiento',
          action: 'porcionamientos',
          feature: C.AlmacenGestion,
          icon: 'content_cut',
          label: 'Porcionamiento',
          titleKey: 'portioning',
          labelKey: 'portioning',
          disabled: false
        },
        {
          title: 'Producción',
          action: 'producciones',
          feature: C.AlmacenGestion,
          icon: 'precision_manufacturing',
          label: 'Producción',
          titleKey: 'production',
          labelKey: 'production',
          disabled: false
        }
      ]
    },
    {
      title: 'Reportes',
      titleKey: 'menuReports',
      feature: C.OperacionReportes,
      children: [
        {
          title: 'Consumo de artículos por subárea',
          action: 'consumoArea',
          feature: [C.AlmacenGestion, C.OperacionReportes],
          icon: 'restaurant_menu',
          label: 'Consumo por subárea',
          titleKey: 'warehouseConsumptionByArea',
          labelKey: 'warehouseConsumptionByArea',
          disabled: false
        },
        {
          title: 'Venta versus costo histórico',
          action: 'ventaCosto',
          feature: [C.AlmacenGestion, C.OperacionReportes],
          icon: 'analytics',
          label: 'Venta vs. costo',
          titleKey: 'salesVersusCost',
          labelKey: 'salesVersusCost',
          disabled: false
        },
        {
          title: 'Consumo teórico versus real',
          action: 'consumoTeoricoReal',
          feature: [C.AlmacenGestion, C.OperacionReportes],
          icon: 'compare_arrows',
          label: 'Teórico vs. real',
          titleKey: 'theoreticalVsActualConsumption',
          labelKey: 'theoreticalVsActualConsumption',
          disabled: false
        },
        {
          title: 'Rentabilidad por producto y canal',
          action: 'rentabilidadProductoCanal',
          feature: [C.AlmacenGestion, C.OperacionReportes],
          icon: 'trending_up',
          label: 'Rentabilidad',
          titleKey: 'profitabilityByProductChannel',
          labelKey: 'profitabilityByProductChannel',
          disabled: false
        },
        {
          title: 'Cobertura de stock',
          action: 'coberturaStock',
          feature: [C.AlmacenGestion, C.OperacionReportes],
          icon: 'hourglass_bottom',
          label: 'Cobertura de stock',
          titleKey: 'stockCoverage',
          labelKey: 'stockCoverage',
          disabled: false
        }
      ]
    }
  ];

  constructor(
    private readonly dialog: MatDialog,
    private readonly licenciaTenantService: LicenciaTenantService
  ) {}

  /**
   * Una sección se muestra si su propia exigencia se cumple y además le queda
   * al menos una opción visible. Antes solo se filtraba la sección de reportes,
   * de modo que todo Almacén aparecía sin estar contratado.
   */
  get seccionesVisibles(): any[] {
    return this.almacenMenu.filter(
      section =>
        this.cubiertoPorLicencia(section.feature) &&
        this.itemsVisibles(section).length > 0,
    );
  }

  itemsVisibles(section: any): any[] {
    return (section.children ?? []).filter((item: any) =>
      this.cubiertoPorLicencia(item.feature),
    );
  }

  /** Una opción sin `feature` no está sujeta a licencia. */
  private cubiertoPorLicencia(feature?: ExigenciaLicencia): boolean {
    return (
      !feature ||
      this.licenciaTenantService.evaluar(this.estadoLicencia, feature)
    );
  }

  openDialog(item: any): void {
    const components: Record<string, ComponentType<unknown>> = {
      articulos: ArticuloMantenimientoComponent,
      recetas: RecetaMantenimientoComponent,
      inventarios: InventarioMantenimientoComponent,
      stockPorArea: StockAlmacenConsultaComponent,
      kardexAlmacen: KardexAlmacenConsultaComponent,
      consumoArea: ConsumoAreaReporteComponent,
      ventaCosto: VentaCostoReporteComponent,
      consumoTeoricoReal: ConsumoTeoricoRealReporteComponent,
      rentabilidadProductoCanal: RentabilidadProductoCanalReporteComponent,
      coberturaStock: CoberturaStockReporteComponent,
      areasAlmacen: AreaAlmacenMantenimientoComponent,
      subareasAlmacen: SubAreaAlmacenMantenimientoComponent,
      proveedores: ProveedorMantenimientoComponent,
      ingresosCompra: EntradaCompraMantenimientoComponent,
      salidasInternas: SalidaInternaMantenimientoComponent,
      transferenciasAlmacen: TransferenciaAlmacenMantenimientoComponent,
      porcionamientos: PorcionamientoMantenimientoComponent,
      producciones: ProduccionMantenimientoComponent,
      motivosSalida: MotivoSalidaMantenimientoComponent,
      gruposAlmacen: GrupoAlmacenMantenimientoComponent
    };
    const component = components[item.action];
    if (!component) {
      return;
    }

    const esMaestroCompacto = [
      'areasAlmacen',
      'subareasAlmacen',
      'proveedores',
      'motivosSalida',
      'gruposAlmacen'
    ].includes(item.action);
    const configuracion = esMaestroCompacto
      ? {
          disableClose: true,
          hasBackdrop: true,
          width: item.action === 'areasAlmacen' ? '760px' : '980px',
          height: item.action === 'areasAlmacen' ? '520px' : '680px',
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 32px)',
          panelClass: 'dialog-window--compact'
        }
      : {
          disableClose: true,
          hasBackdrop: true,
          width: 'calc(100vw - 32px)',
          height: 'calc(100vh - 32px)',
          maxWidth: '1240px',
          maxHeight: '880px',
          panelClass: 'dialog-window--workspace'
        };

    const elementoActivo = document.activeElement;
    if (elementoActivo instanceof HTMLElement) {
      elementoActivo.blur();
    }

    this.dialog.open(component, configuracion);
  }

  ngOnInit(): void {
    this.licenciaTenantService
      .obtenerEstado()
      .subscribe(estado => (this.estadoLicencia = estado));
  }
}
