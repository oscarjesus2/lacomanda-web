import { Component, OnInit } from '@angular/core';

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
        { title: 'Artículos', route: '/almacen/articulos', icon: 'inventory',  label: 'Artículos', titleKey: 'items',   labelKey: 'items'   },
        { title: 'Recetas',   route: '/almacen/recetas',   icon: 'menu_book',  label: 'Recetas',   titleKey: 'recipes', labelKey: 'recipes' }
      ]
    },
    { title: 'Ingresos',        icon: 'move_to_inbox',           label: 'Ingresos',        titleKey: 'stockIn',      labelKey: 'stockIn',      children: [] },
    { title: 'Salidas',         icon: 'outbox',                  label: 'Salidas',         titleKey: 'stockOut',     labelKey: 'stockOut',     children: [] },
    { title: 'Transferencias',  icon: 'swap_horiz',              label: 'Transferencias',  titleKey: 'transfers',    labelKey: 'transfers',    children: [] },
    { title: 'Inventarios',     icon: 'fact_check',              label: 'Inventarios',     titleKey: 'inventories',  labelKey: 'inventories',  children: [] },
    { title: 'Porcionamiento',  icon: 'content_cut',             label: 'Porcionamiento',  titleKey: 'portioning',   labelKey: 'portioning',   children: [] },
    { title: 'Producción',      icon: 'precision_manufacturing', label: 'Producción',      titleKey: 'production',   labelKey: 'production',   children: [] }
  ];

  constructor() { }

  ngOnInit(): void {
  }

}
