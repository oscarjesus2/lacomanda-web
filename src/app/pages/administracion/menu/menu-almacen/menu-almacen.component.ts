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
      children: [
        { title: 'Artículos', route: '/almacen/articulos' },
        { title: 'Recetas', route: '/almacen/recetas' }
      ]
    },
    {
      title: 'Ingresos',
      children: []
    },
    {
      title: 'Salidas',
      children: []
    },
    {
      title: 'Transferencias',
      children: []
    },
    {
      title: 'Inventarios',
      children: []
    },
    {
      title: 'Porcionamiento',
      children: []
    },
    {
      title: 'Producción',
      children: []
    }
  ];

  constructor() { }

  ngOnInit(): void {
  }

}
