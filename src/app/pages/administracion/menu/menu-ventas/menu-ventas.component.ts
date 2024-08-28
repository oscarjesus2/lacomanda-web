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
<<<<<<< HEAD
=======
import { ClienteMantenimientoComponent } from 'src/app/components/mantenimiento/cliente-mantenimiento/cliente-mantenimiento.component';
>>>>>>> baf55da921f303e4c253134a43c0638b74959374
 

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
        { title: 'Grupos', route: '/ventas/grupos' },
        { title: 'Productos', route: '/ventas/productos' },
        { title: 'Clientes', route: '/ventas/clientes' },
        { title: 'Configuración de Combos', route: '/ventas/configuracion-combos' },
        { title: 'Socios de Negocio', route: '/ventas/socios-negocio' },
        { title: 'Colores', route: '/ventas/colores' },
        { title: 'Configuración de Ambientes', route: '/ventas/configuracion-ambientes' },
        { title: 'Configuración de Mesas', route: '/ventas/configuracion-mesas' },
        { title: 'Descuentos', route: '/ventas/descuentos' },
        { title: 'Empleados', route: '/ventas/empleados' },
        { title: 'Familia de Productos', route: '/ventas/familia-productos' },
        { title: 'Sub Familia de Productos', route: '/ventas/subfamilia-productos' },
        { title: 'Promociones', route: '/ventas/promociones' },
        { title: 'Observaciones', route: '/ventas/observaciones' },
        { title: 'Tarjetas', route: '/ventas/tarjetas' }
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

    if (item.title === 'Clientes') 
      {
        this.OpenClienteMantenimientoComponent();
      } 
    if (item.title === 'Abrir Turno') 
    {
      this.OpenDialogTurno();
    } 
    else if (item.title === 'Listado de Ventas') 
    {
      this.OpenDialogVentasGeneralesTurno();
    }
    else if (item.title === 'Contable') 
    {
      this.OpenDialogReportecontableComponent();
    }
  }

  OpenDialogVentasGeneralesTurno(): void {

    const dialogTurno = this.dialog.open(DialogVentasgeneralesComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '100vw',  // Cambiado a 100vw para ocupar todo el espacio
      height: '100vh', // Cambiado a 100vh para ocupar todo el espacio
      maxWidth: '100vw',
      maxHeight: '100vh'
      // data: { oPedidoMesa: listData, IdMesa: IdMesa, Mesa: this.mesaSelected.Descripcion + ' ' + this.mesaSelected.Numero}
    });
  }

  OpenDialogReportecontableComponent(): void {
  
    const dialog = this.dialog.open(DialogReportecontableComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '600px', // Establece el ancho del diálogo
      height: '410px', // Establece la altura del diálogo
    });
  }
<<<<<<< HEAD
=======

  OpenClienteMantenimientoComponent(): void {
  
    const dialog = this.dialog.open(ClienteMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '800px', // Establece el ancho del diálogo
      height: '800px', // Establece la altura del diálogo
    });
  }

>>>>>>> baf55da921f303e4c253134a43c0638b74959374
  OpenDialogTurno(): void {

    const dialogTurno = this.dialog.open(DialogTurnoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '600px', height: '400px'
      // data: { oPedidoMesa: listData, IdMesa: IdMesa, Mesa: this.mesaSelected.Descripcion + ' ' + this.mesaSelected.Numero}
    });
 
    dialogTurno.afterClosed().subscribe(async data => {

      await this.TurnoService.ObtenerTurno('001').subscribe(data => {
        if (data == null){
      
          this.loginService.idturnoShare.emit(0);
          this.loginService.nroturnoShare.emit(0);
          this.loginService.turnoOpenShare.emit(false);
       
        }else{
          this.loginService.idturnoShare.emit(data.IdTurno);
          this.loginService.nroturnoShare.emit(data.NroTurno);
          this.loginService.turnoOpenShare.emit(true);
          console.log(data.IdTurno);
          console.log(data.NroTurno);
          
        }
  
      });
      
    });


  }

  ngOnInit(): void {
  }

}