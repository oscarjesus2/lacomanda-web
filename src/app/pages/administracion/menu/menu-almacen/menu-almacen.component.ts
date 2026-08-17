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
import { StockAlmacenConsultaComponent } from 'src/app/components/mantenimiento/stock-almacen-consulta/stock-almacen-consulta.component';
import { KardexAlmacenConsultaComponent } from 'src/app/components/mantenimiento/kardex-almacen-consulta/kardex-almacen-consulta.component';
import { ConsumoAreaReporteComponent } from 'src/app/components/mantenimiento/consumo-area-reporte/consumo-area-reporte.component';
import { VentaCostoReporteComponent } from 'src/app/components/mantenimiento/venta-costo-reporte/venta-costo-reporte.component';
import { ConsumoTeoricoRealReporteComponent } from 'src/app/components/mantenimiento/consumo-teorico-real-reporte/consumo-teorico-real-reporte.component';
import { RentabilidadProductoCanalReporteComponent } from 'src/app/components/mantenimiento/rentabilidad-producto-canal-reporte/rentabilidad-producto-canal-reporte.component';
import { CoberturaStockReporteComponent } from 'src/app/components/mantenimiento/cobertura-stock-reporte/cobertura-stock-reporte.component';
import { LicenciaTenantService } from 'src/app/services/licencia-tenant.service';

@Component({
  selector: 'app-menu-almacen',
  templateUrl: './menu-almacen.component.html'
})
export class MenuAlmacenComponent implements OnInit {
  reportesHabilitados = false;

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
          icon: 'inventory',
          label: 'Artículos',
          titleKey: 'items',
          labelKey: 'items',
          disabled: false
        },
        {
          title: 'Recetas',
          action: 'recetas',
          icon: 'menu_book',
          label: 'Recetas',
          titleKey: 'recipes',
          labelKey: 'recipes',
          disabled: false
        },
        {
          title: 'Áreas de almacén',
          action: 'areasAlmacen',
          icon: 'warehouse',
          label: 'Áreas de almacén',
          titleKey: 'warehouseAreas',
          labelKey: 'warehouseAreas',
          disabled: false
        },
        {
          title: 'Subáreas de almacén',
          action: 'subareasAlmacen',
          icon: 'account_tree',
          label: 'Subáreas de almacén',
          titleKey: 'warehouseSubareas',
          labelKey: 'warehouseSubareas',
          disabled: false
        },
        {
          title: 'Proveedores',
          action: 'proveedores',
          icon: 'local_shipping',
          label: 'Proveedores',
          titleKey: 'suppliers',
          labelKey: 'suppliers',
          disabled: false
        },
        {
          title: 'Motivos de salida',
          action: 'motivosSalida',
          icon: 'assignment_late',
          label: 'Motivos salida',
          titleKey: 'stockOutReasons',
          labelKey: 'stockOutReasons',
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
          icon: 'move_to_inbox',
          label: 'Ingresos',
          titleKey: 'stockIn',
          labelKey: 'stockIn',
          disabled: false
        },
        {
          title: 'Salidas',
          action: 'salidasInternas',
          icon: 'outbox',
          label: 'Salidas',
          titleKey: 'stockOut',
          labelKey: 'stockOut',
          disabled: false
        },
        {
          title: 'Transferencias',
          action: 'transferenciasAlmacen',
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
          icon: 'fact_check',
          label: 'Inventarios',
          titleKey: 'inventories',
          labelKey: 'inventories',
          disabled: false
        },
        {
          title: 'Stock por área',
          action: 'stockPorArea',
          icon: 'query_stats',
          label: 'Stock por área',
          titleKey: 'stockByArea',
          labelKey: 'stockByArea',
          disabled: false
        },
        {
          title: 'Kardex',
          action: 'kardexAlmacen',
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
          icon: 'content_cut',
          label: 'Porcionamiento',
          titleKey: 'portioning',
          labelKey: 'portioning',
          disabled: false
        },
        {
          title: 'Producción',
          action: 'producciones',
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
      feature: 'operacion.reportes',
      children: [
        {
          title: 'Consumo de artículos por subárea',
          action: 'consumoArea',
          icon: 'restaurant_menu',
          label: 'Consumo por subárea',
          titleKey: 'warehouseConsumptionByArea',
          labelKey: 'warehouseConsumptionByArea',
          disabled: false
        },
        {
          title: 'Venta versus costo histórico',
          action: 'ventaCosto',
          icon: 'analytics',
          label: 'Venta vs. costo',
          titleKey: 'salesVersusCost',
          labelKey: 'salesVersusCost',
          disabled: false
        },
        {
          title: 'Consumo teórico versus real',
          action: 'consumoTeoricoReal',
          icon: 'compare_arrows',
          label: 'Teórico vs. real',
          titleKey: 'theoreticalVsActualConsumption',
          labelKey: 'theoreticalVsActualConsumption',
          disabled: false
        },
        {
          title: 'Rentabilidad por producto y canal',
          action: 'rentabilidadProductoCanal',
          icon: 'trending_up',
          label: 'Rentabilidad',
          titleKey: 'profitabilityByProductChannel',
          labelKey: 'profitabilityByProductChannel',
          disabled: false
        },
        {
          title: 'Cobertura de stock',
          action: 'coberturaStock',
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

  get seccionesVisibles(): any[] {
    return this.almacenMenu.filter(
      section => !section.feature || this.reportesHabilitados
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
      motivosSalida: MotivoSalidaMantenimientoComponent
    };
    const component = components[item.action];
    if (!component) {
      return;
    }

    const esMaestroCompacto = [
      'areasAlmacen',
      'subareasAlmacen',
      'proveedores',
      'motivosSalida'
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
    this.licenciaTenantService.obtener().subscribe({
      next: response => {
        const licencia = response.Data;
        this.reportesHabilitados = licencia == null ||
          licencia.Caracteristicas?.some(caracteristica =>
            caracteristica.Codigo === 'operacion.reportes' &&
            caracteristica.Habilitada
          ) === true;
      },
      error: () => this.reportesHabilitados = false
    });
  }
}
