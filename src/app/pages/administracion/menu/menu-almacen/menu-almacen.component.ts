import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-menu-almacen',
  templateUrl: './menu-almacen.component.html',
  styleUrls: ['./menu-almacen.component.css']
})
export class MenuAlmacenComponent implements OnInit {

  almacenMenu = [
    {
      title: 'Maestros',
      icon: 'inventory',
      children: [
        { title: 'Artículos', route: '/almacen/articulos', icon: 'inventory',  label: 'Artículos' },
        { title: 'Recetas',   route: '/almacen/recetas',   icon: 'menu_book',  label: 'Recetas'   }
      ]
    },
    { title: 'Ingresos',        icon: 'move_to_inbox',           label: 'Ingresos',        children: [] },
    { title: 'Salidas',         icon: 'outbox',                  label: 'Salidas',         children: [] },
    { title: 'Transferencias',  icon: 'swap_horiz',              label: 'Transferencias',  children: [] },
    { title: 'Inventarios',     icon: 'fact_check',              label: 'Inventarios',     children: [] },
    { title: 'Porcionamiento',  icon: 'content_cut',             label: 'Porcionamiento',  children: [] },
    { title: 'Producción',      icon: 'precision_manufacturing', label: 'Producción',      children: [] }
  ];

  constructor() { }

  ngOnInit(): void {
  }

}
