import { Component, OnInit } from '@angular/core';
import { ComponentType } from '@angular/cdk/portal';
import { MatDialog } from '@angular/material/dialog';
import { AreaAlmacenMantenimientoComponent } from 'src/app/components/mantenimiento/area-almacen-mantenimiento/area-almacen-mantenimiento.component';
import { ArticuloMantenimientoComponent } from 'src/app/components/mantenimiento/articulo-mantenimiento/articulo-mantenimiento.component';
import { InventarioMantenimientoComponent } from 'src/app/components/mantenimiento/inventario-mantenimiento/inventario-mantenimiento.component';
import { RecetaMantenimientoComponent } from 'src/app/components/mantenimiento/receta-mantenimiento/receta-mantenimiento.component';
import { SubAreaAlmacenMantenimientoComponent } from 'src/app/components/mantenimiento/subarea-almacen-mantenimiento/subarea-almacen-mantenimiento.component';

@Component({
  selector: 'app-menu-almacen',
  templateUrl: './menu-almacen.component.html',
  styleUrls: ['./menu-almacen.component.css']
})
export class MenuAlmacenComponent implements OnInit {
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
        }
      ]
    },
    {
      title: 'Ingresos',
      icon: 'move_to_inbox',
      label: 'Ingresos',
      titleKey: 'stockIn',
      labelKey: 'stockIn',
      children: []
    },
    {
      title: 'Salidas',
      icon: 'outbox',
      label: 'Salidas',
      titleKey: 'stockOut',
      labelKey: 'stockOut',
      children: []
    },
    {
      title: 'Transferencias',
      icon: 'swap_horiz',
      label: 'Transferencias',
      titleKey: 'transfers',
      labelKey: 'transfers',
      children: []
    },
    {
      title: 'Inventarios',
      action: 'inventarios',
      icon: 'fact_check',
      label: 'Inventarios',
      titleKey: 'inventories',
      labelKey: 'inventories',
      children: []
    },
    {
      title: 'Porcionamiento',
      icon: 'content_cut',
      label: 'Porcionamiento',
      titleKey: 'portioning',
      labelKey: 'portioning',
      children: []
    },
    {
      title: 'Producción',
      icon: 'precision_manufacturing',
      label: 'Producción',
      titleKey: 'production',
      labelKey: 'production',
      children: []
    }
  ];

  constructor(private readonly dialog: MatDialog) {}

  openDialog(item: any): void {
    const components: Record<string, ComponentType<unknown>> = {
      articulos: ArticuloMantenimientoComponent,
      recetas: RecetaMantenimientoComponent,
      inventarios: InventarioMantenimientoComponent,
      areasAlmacen: AreaAlmacenMantenimientoComponent,
      subareasAlmacen: SubAreaAlmacenMantenimientoComponent
    };
    const component = components[item.action];
    if (!component) {
      return;
    }

    const esMaestroCompacto = [
      'areasAlmacen',
      'subareasAlmacen'
    ].includes(item.action);
    const configuracion = esMaestroCompacto
      ? {
          disableClose: true,
          hasBackdrop: true,
          width: item.action === 'areasAlmacen' ? '760px' : '980px',
          height: item.action === 'areasAlmacen' ? '520px' : '560px',
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

    this.dialog.open(component, configuracion);
  }

  ngOnInit(): void {}
}
