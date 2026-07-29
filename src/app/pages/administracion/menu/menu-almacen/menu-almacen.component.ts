import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ArticuloMantenimientoComponent } from 'src/app/components/mantenimiento/articulo-mantenimiento/articulo-mantenimiento.component';

@Component({
  selector: 'app-menu-almacen',
  templateUrl: './menu-almacen.component.html',
  styleUrls: ['./menu-almacen.component.css']
})
export class MenuAlmacenComponent implements OnInit {

  almacenMenu = [
    {
      title: 'Maestros', titleKey: 'menuMasters', labelKey: 'menuMasters',
      icon: 'inventory',
      children: [
        { title: 'Artículos', action: 'articulos', icon: 'inventory', label: 'Artículos', titleKey: 'items', labelKey: 'items', disabled: false },
        { title: 'Recetas', action: '', icon: 'menu_book', label: 'Recetas', titleKey: 'recipes', labelKey: 'recipes', disabled: true }
      ]
    },
    { title: 'Ingresos',        icon: 'move_to_inbox',           label: 'Ingresos',        titleKey: 'stockIn',      labelKey: 'stockIn',      children: [] },
    { title: 'Salidas',         icon: 'outbox',                  label: 'Salidas',         titleKey: 'stockOut',     labelKey: 'stockOut',     children: [] },
    { title: 'Transferencias',  icon: 'swap_horiz',              label: 'Transferencias',  titleKey: 'transfers',    labelKey: 'transfers',    children: [] },
    { title: 'Inventarios',     icon: 'fact_check',              label: 'Inventarios',     titleKey: 'inventories',  labelKey: 'inventories',  children: [] },
    { title: 'Porcionamiento',  icon: 'content_cut',             label: 'Porcionamiento',  titleKey: 'portioning',   labelKey: 'portioning',   children: [] },
    { title: 'Producción',      icon: 'precision_manufacturing', label: 'Producción',      titleKey: 'production',   labelKey: 'production',   children: [] }
  ];

  constructor(private readonly dialog: MatDialog) { }

  openDialog(item: any): void {
    if (item.action !== 'articulos') {
      return;
    }

    this.dialog.open(ArticuloMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: 'calc(100vw - 32px)',
      height: 'calc(100vh - 32px)',
      maxWidth: '1240px',
      maxHeight: '880px',
      panelClass: 'dialog-window--workspace'
    });
  }

  ngOnInit(): void {
  }

}
