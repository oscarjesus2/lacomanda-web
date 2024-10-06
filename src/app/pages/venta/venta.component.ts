import { Component, OnInit, ViewChild, inject, HostListener  } from '@angular/core';
import { Breakpoints, BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';


import { MatDialog } from '@angular/material/dialog';
import { MatMenuTrigger } from '@angular/material/menu';
import { NgxSpinnerService } from 'ngx-spinner';
import Swal from 'sweetalert2';

//Components
import { DialogDeleteProductComponent } from '../../components/dialog-delete-product/dialog-product-delete.component';
import { DialogVerPedidoComponent } from '../../components/dialog-ver-pedido/dialog-ver-pedido.component';
import { DialogObservacionComponent } from '../../components/dialog-observacion/dialog-observacion.component';

import { DialogMozoComponent } from '../../components/dialog-mozo/dialog-mozo.component';
import { DialogEnviarPedidoComponent } from '../../components/dialog-grabar-pedido/dialog-grabar-pedido.component';


//Models
import { Product } from '../../models/product.models';
import { Ambiente } from '../../models/ambiente.models';
import { Mesas } from '../../models/mesas.models';
import { ProductGrid } from '../../models/product.grid.models';
import { Empleado } from '../../models/empleado.models';
import { PedidoDet } from '../../models/pedidodet.models';
import { Observacion } from '../../models/observacion.models';
import { PedidoCab } from '../../models/pedido.models';
import { Familia } from '../../models/familia.models';
import { SubFamilia } from '../../models/subfamilia.models';
import { Usuario } from '../../models/usuario.models';

// Servicios
import { StorageService } from '../../services/storage.service';
import { ProductService } from '../../services/product.service';
import { MesasService } from '../../services/mesas.service';
import { ResponseService } from '../../models/response.services';
import { FamiliaService } from '../../services/familia.service';
import { AmbienteService } from '../../services/ambiente.services';
import { ObservacionService } from '../../services/observacion.service';
import { PedidoService } from '../../services/pedido.service';
import { TurnoService } from '../../services/turno.service';
import { EmpleadoService } from '../../services/empleado.service';
import { Turno } from 'src/app/models/turno.models';
import { Router } from '@angular/router';
import { LoginService } from 'src/app/services/auth/login.service';
import { DialogEmitirComprobanteComponent } from 'src/app/components/dialog-emitir-comprobante/dialog-emitir-comprobante.component';
import { ApiResponse } from 'src/app/interfaces/ApiResponse.interface';
import { PedidoMesaDTO } from 'src/app/interfaces/pedidomesaDTO.interface';
import { AnularProductoYComplementoDTO } from 'src/app/interfaces/anularProductoYComplementoDTO.interface';
import { ImpresionDTO } from 'src/app/interfaces/impresionDTO.interface';

@Component({
  selector: 'app-venta',
  templateUrl: './venta.component.html',
  styleUrls: ['./venta.component.css']
})

export class VentaComponent implements OnInit {

  isEdited: boolean;
  elementArr: any = [].fill(0);
  public turnoAbierto: Turno;
  public user: Usuario;
  public displayedColumns: string[] = ['NombreProducto', 'Precio', 'Cantidad', 'actions'];
  public ListaProductosdisplayedColumns: string[] = ['icoObs', 'nombrecorto', 'precio', 'add', 'cantidad', 'remove', 'actions'];
  public DEFAULT_ID = 0;
  public listProducts: Product[];
  public listProducts_x_SubFamilia: Product[];
  public listAmbiente: Ambiente[];
  public listFamilia: Familia[];
  public listSubFamilia: SubFamilia[];
  public listSubFamilia_x_Familia: SubFamilia[];
  public selectedValue: string;
  public DisplayValueAmbiente: string;
  public selectedValueDos: string;
  public ListaMesasTotal: Mesas[];
  public ListaMesas_x_Ambiente: Mesas[];
  public ListaEmpleados: Empleado[];
  public ListaObservacion: Observacion[];
  public oTurno: Turno;
  public StyleCustom: string = "height: 90%";
  public IdSubFamila: string;
  public pedidoId: number = 0;

  public horaPedido: string = "";
  public userLoged: any = { id: "", username: "" };

  public listProductGrid: PedidoDet[] = [];
  public GridListaPedidoDetProducto = new MatTableDataSource<PedidoDet>();
  // public ListaPedidoDetProducto: PedidoDet[] = [];

  public MostrarOcultarPanelProducto: Boolean;
  public MostrarOcultarPanelMesa: Boolean;
  public MostrarOcultarPanelPedido: Boolean;
  public mozoSelected: Empleado;
  public mesaSelected: Mesas;
  public NroPaxSelected: string = "0";

  public RehacerPantallaRefresh: string = "";


  @ViewChild(MatPaginator) paginator: MatPaginator;

  ngAfterViewInit() {

    this.GridListaPedidoDetProducto.paginator = this.paginator;
  }

  constructor(
    private loginService: LoginService,
    private router: Router,
    private storageService: StorageService,
    private productService: ProductService,
    private TurnoService: TurnoService,
    private ambienteService: AmbienteService,
    private mesasService: MesasService,
    private empleadoService: EmpleadoService,
    private ObservacionService: ObservacionService,
    private pedidoService: PedidoService,
    private dialogProductoCantidad: MatDialog,
    private dialogMesa: MatDialog,
    private dialogDeleteProduct: MatDialog,
    private dialogComprobante: MatDialog,
    private dialogEmisionComprobante: MatDialog,
    private spinnerService: NgxSpinnerService,
    private familiaService: FamiliaService) {


    this.MostrarOcultarPanelMesa = true;
    this.MostrarOcultarPanelProducto = false;
    this.mozoSelected = new Empleado;
    this.mesaSelected = new Mesas;
    this.MostrarOcultarPanelPedido = false;
    this.RehacerPantallaRefresh = 'Refresh';


  }

  enterFullScreen() {
    const elem = document.documentElement;
  
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else {
      console.warn("Pantalla completa no es soportada por este navegador.");
    }
  }

  @HostListener('document:fullscreenchange', ['$event'])
  onFullScreenChange(event: Event) {
    console.log('Fullscreen status changed');
  }

  async ngOnInit() {
    this.enterFullScreen();
    this.spinnerService.show();

    try {

      await this.TurnoService.ObtenerTurno('001').subscribe(data => {
        this.turnoAbierto = data;
      });


      // 1. Se carga servicio para obtener productos
      this.listProducts = await this.productService.getAllProducts().toPromise();
      // 2. Se carga servicio para obtener mesas
      this.ListaMesasTotal = await this.mesasService.getAllMesas().toPromise();
      // 3. Se carga servicio para obtener Mozos
      this.ListaEmpleados = await this.empleadoService.getAllEmpleados().toPromise();
      // 4. Se carga servicio para obtener ambientes
      this.listAmbiente = await this.ambienteService.getAllAmbiente().toPromise();
      // 5. Se carga combo familia
      this.listFamilia = await this.familiaService.getFamilia().toPromise();
      // 6. Se carga la sub familia
      this.listSubFamilia = await this.familiaService.getSubFamilia().toPromise();
      // 7. Se carga servicio observacion
      this.ListaObservacion = (await this.ObservacionService.getAllObservacion().toPromise()).Data;

      this.mozoSelected.IdEmpleado = this.storageService.getCurrentSession().User.IdEmpleado;

      let result: Ambiente;
      result = this.listAmbiente.find(item => item.Estado == 1);
      this.MostrarMesas_x_Ambiente(result);
      
      this.userLoged = {
        id: this.storageService.getCurrentSession().User.IdEmpleado,
        username: this.storageService.getCurrentSession().User.Username
      };

      this.MostrarOcultarPanelMesa = true;
      this.spinnerService.hide();
    } catch (_) {
      this.spinnerService.hide();
      this.salir();
    }
  }

  public salir(): void {
    this.storageService.logout();
  }

  async MostrarMesas_x_Ambiente(ambiente: Ambiente) {
    this.spinnerService.show();
    this.ListaMesas_x_Ambiente = this.ListaMesasTotal.filter(x => x.IdAmbiente === ambiente.IdAmbiente);
    console.log(this.ListaMesas_x_Ambiente);
    this.DisplayValueAmbiente = ambiente.Descripcion;
    this.spinnerService.hide();
  }


  async ListarSubFamilia_x_Familia(oFamilia: Familia) {
    this.spinnerService.show();
    this.listProducts_x_SubFamilia = [];
    this.listSubFamilia_x_Familia = this.listSubFamilia.filter(x => x.IdFamilia === oFamilia.IdFamilia);
    let oSubFamilia = this.listSubFamilia_x_Familia.find((item) => (item.IdFamilia === oFamilia.IdFamilia));
    this.ListarProductos_x_SubFamilia(oSubFamilia);
    this.spinnerService.hide();
  }

  async ListarProductos_x_SubFamilia(oSubFamilia: SubFamilia) {
    this.spinnerService.show();
    console.log(this.listProducts);
    this.IdSubFamila = oSubFamilia.IdSubFamilia;
    this.listProducts_x_SubFamilia = this.listProducts.filter(x => x.IdSubFamilia === oSubFamilia.IdSubFamilia);
    //this.GridListaPedidoDetProducto.data = this.ListaPedidoDetProducto.filter(x=> x.IdSubFamilia===subFamiliaId);
    this.spinnerService.hide();
  }


  async openDialogMesa(mesa: Mesas) {
    this.spinnerService.show();

    this.limpiarPedido();
    if (mesa.Ocupado == 0) {
      this.mesaSelected = mesa;
      this.MostrarOcultarPanelProducto = true;
      this.MostrarOcultarPanelMesa = false;
      this.mozoSelected.IdEmpleado = this.storageService.getCurrentSession().User.IdEmpleado;
      console.log(this.storageService.getCurrentSession().User.IdEmpleado);
 

    } else {
      const listData: ApiResponse<PedidoMesaDTO[]> = await this.pedidoService.findPedidoMesaByIdMesa(mesa.IdMesa).toPromise();
      if (listData.Data.length > 0) {
        this.rellenarHeaderPedido(listData.Data);
        this.listProductGrid = this.getPedidoDetByResponse(listData.Data);
        this.GridListaPedidoDetProducto.data = this.listProductGrid;
        this.mesaSelected = mesa;
        this.MostrarOcultarPanelProducto = true;
        this.MostrarOcultarPanelMesa = false;
 

      } else {

        Swal.fire(
          'Ups.!',
          'No existe el pedido en la mesa.',
          'warning'
        );
        this.ListaMesasTotal = await this.mesasService.getAllMesas().toPromise();
      }
    }
    this.RehacerPantallaRefresh = 'RehacerPantalla';
    this.spinnerService.hide();
  }



  async openDialogVerPedido(IdMesa: string) {
    try {
      this.spinnerService.show();
      const listData: ApiResponse<PedidoMesaDTO[]> = await this.pedidoService.findPedidoMesaByIdMesa(IdMesa).toPromise();

      if (listData.Data.length > 0) {
        // this.rellenarHeaderPedido(listData);

        const dialogEnviarPedidoRef = this.dialogMesa.open(DialogVerPedidoComponent, {
          disableClose: true,
          hasBackdrop: true,
          width: '400px',
          data: { oPedidoMesa: listData, IdMesa: IdMesa, Mesa: this.mesaSelected.Descripcion + ' ' + this.mesaSelected.Numero }
        });

        dialogEnviarPedidoRef.afterClosed().subscribe(data => {

          if (data.Resultado) {
            this.RehacerPantalla();
          }
        });

      } else {

        Swal.fire(
          'Ups.!',
          'No existe el pedido en la mesa.',
          'warning'
        );
        this.ListaMesasTotal = await this.mesasService.getAllMesas().toPromise();
      }


    } catch (e) {
      Swal.fire(
        'Algo anda mal',
        e.error,
        'error'
      )
      console.log(e);
    } finally {
      this.spinnerService.hide();

    }

  }

  async openEmitirComprobante() {
    try {
     

 
  

    } catch (e) {
      Swal.fire(
        'Algo anda mal',
        e.error,
        'error'
      )
      console.log(e);
    } finally {
      this.spinnerService.hide();

    }

  }
  async openDialoObservaciones(oPedidoDet: PedidoDet) {
    try {
      if (oPedidoDet.Cantidad == 0) {
        Swal.fire(
          'Ups.!',
          'Agregue primero la cantidad.',
          'warning'
        );
      } else {
        this.spinnerService.show();


        const dialogEnviarPedidoRef = this.dialogMesa.open(DialogObservacionComponent, {
          hasBackdrop: true,
          width: '400px',
          data: { ListaObservacion: this.ListaObservacion, Observaciones: oPedidoDet.Observacion, NombreCorto: oPedidoDet.Producto.NombreCorto }
        });

        dialogEnviarPedidoRef.afterClosed().subscribe(Resultado => {
          oPedidoDet.Observacion = Resultado.Observaciones;
        })


      }
    } catch (e) {
      Swal.fire(
        'Algo anda mal',
        e.error,
        'error'
      )
      console.log(e);
    } finally {
      this.spinnerService.hide();

    }

  }



  async aumentarProductGrid(oPedidoDet: PedidoDet) {


    oPedidoDet.Cantidad += 1;

  }

  async restarProductGrid(oPedidoDet: PedidoDet) {


    if (oPedidoDet.Cantidad > 1) {
      oPedidoDet.Cantidad -= 1;
    }

  }
  async deleteProductGrid(oPedidoDet: PedidoDet) {

    var dataSet: any = {
      nombreProducto: oPedidoDet.Producto.NombreCorto,
      motivoAnulacion: '',
      confirmacion: false
    };

    if (oPedidoDet.Item > 0) {

      const dialogDeleetProductRef = this.dialogDeleteProduct.open(DialogDeleteProductComponent, {
        width: '350px',
        data: dataSet,
        hasBackdrop: true
      });

      var resultDialog: any = await dialogDeleetProductRef.afterClosed().toPromise();

      if (resultDialog.confirmacion) {

        var pedidoDelete: AnularProductoYComplementoDTO;
          this.storageService.getCurrentSession().User.IdUsuario,
          resultDialog.motivoAnulacion,
          oPedidoDet.IdPedido,
          oPedidoDet.Producto.IdProducto,
          oPedidoDet.Item;

        this.spinnerService.show();
        var responseService: ApiResponse<ImpresionDTO[]> = await this.pedidoService.AnularProductoYComplemento(pedidoDelete).toPromise();
        var cofigoOk: number = 200;

        if (responseService.Success) {
          var removeIndex = this.listProductGrid.map(function (item) { return item }).indexOf(oPedidoDet);
          this.listProductGrid.splice(removeIndex, 1);
          this.GridListaPedidoDetProducto.data = this.listProductGrid;
          if (this.listProductGrid.length == 0) {
            this.limpiarPedido();
            this.MostrarOcultarPanelMesa = true;
            this.MostrarOcultarPanelProducto = false;
            this.ListaMesasTotal = await this.mesasService.getAllMesas().toPromise();
          }
        }
        this.spinnerService.hide();
      }
    } else {
      // var removeIndex = this.listProductGrid.map(function (item) { return item.IdProducto; }).indexOf(oPedidoDet.IdProducto);
      var removeIndex = this.listProductGrid.map(function (item) { return item }).indexOf(oPedidoDet);
      this.listProductGrid.splice(removeIndex, 1);
      this.GridListaPedidoDetProducto.data = this.listProductGrid;
    }

  }
 
  public AgregarProducto(product: Product): void {
    this.listProductGrid.push(new PedidoDet({
      Item: this.DEFAULT_ID,
      IdPedido: this.pedidoId == 0 ? this.DEFAULT_ID : this.pedidoId,
      Producto: product,
      Precio: product.Precio,
      Cantidad: 1,
      Subtotal: 1 * product.Precio,
      Observacion: '',
      Ip: ''}
    )
    );
    this.GridListaPedidoDetProducto.data = this.listProductGrid;
  }

  public openDialogObservacion(product: Product): void {
    var cant: number;
    var Obs: string;
    const dialogProductRef = this.dialogProductoCantidad.open(DialogObservacionComponent, {
      hasBackdrop: true,
      width: '250px',
      data: { ListaObservacion: this.ListaObservacion, Observaciones: product.Observacion, NombreCorto: product.NombreCorto }
    });

    dialogProductRef.afterClosed().subscribe(result => {
      if (result.cantidad) {
        if (result.cantidad > 0) {
          cant = result.cantidad;
          Obs = result.observacion;
          this.listProductGrid.push(new PedidoDet(
            {
            Item : this.DEFAULT_ID,
            IdPedido:this.pedidoId == 0 ? this.DEFAULT_ID : this.pedidoId,
            Producto: product,
            Precio:product.Precio,
            Cantidad: cant,
            Subtotal: cant * product.Precio,
            Observacion: Obs,
            Ip:this.storageService.getCurrentIP()
          })
          );
          this.GridListaPedidoDetProducto.data = this.listProductGrid;
        } else {
          Swal.fire(
            'Ups.!',
            'Ingrese una cantidad.',
            'warning'
          )
        }
      }
    });
  }

  async processPedido() {
      this.spinnerService.show();
  
      if (this.listProductGrid.length > 0) {

        var listPedidoDetails: PedidoDet[] = [];

        this.listProductGrid.forEach(productGrid => {
          let pedidoDetail: PedidoDet = new PedidoDet(
            {
            Item: productGrid.Item,
            IdPedido : productGrid.IdPedido = productGrid.IdPedido,
            // IdProducto: productGrid.IdProducto,
            // NombreCorto: '',
            Precio: productGrid.Precio,
            Cantidad: productGrid.Cantidad,
            Subtotal : productGrid.Precio*productGrid.Cantidad,
            Observacion : productGrid.Observacion,
            Ip: this.storageService.getCurrentIP()
          }
          );
          
          listPedidoDetails.push(pedidoDetail);
        });

        var pedido: PedidoCab = new PedidoCab(
          {
            IdEmpleado: this.mozoSelected.IdEmpleado,
            IdPedido: this.pedidoId == 0 ? this.DEFAULT_ID : this.pedidoId,
            Total: this.getTotalByListProductGrid(),
            Importe: this.getTotalByListProductGrid(),
            UsuReg: this.storageService.getCurrentSession().User.IdUsuario,
            UsuMod: this.storageService.getCurrentSession().User.IdUsuario,
            IdMesa: this.mesaSelected.IdMesa, Mesa: this.mesaSelected.Mesa, NroPax: parseInt(this.NroPaxSelected),
            ListaPedidoDet: listPedidoDetails
        }
        );

        var responseRegisterPedido: any = await this.pedidoService.RegistrarPedido(pedido).toPromise();

        if (responseRegisterPedido) {
       
          this.limpiarPedido();

       
          this.mesasService.getAllMesas().subscribe(data => {
            this.ListaMesasTotal = data;
            let result: Ambiente;
            result = this.listAmbiente.find(item => item.Estado == 1);
            this.MostrarMesas_x_Ambiente(result);
          });

          this.MostrarOcultarPanelMesa = true;
          this.MostrarOcultarPanelProducto = false;
          
          Swal.fire(
            'Good job!',
            'Se registro el pedido correctamente.',
            'success'
          )
        }
      } else {
        Swal.fire('Oops...', 'No ha ingresado ningun producto.', 'error')
      }

  }

  async processComprobante() {
    if (this.pedidoId > 0) {
      var allSaved: Boolean = true;
      for (var i = 0; i < this.listProductGrid.length; i++) {
        if (this.listProductGrid[i].Item == 0) {
          allSaved = false;
          break;
        }
      }
      if (allSaved) {

        var dataSet: any = {
          idPedido: this.pedidoId,
          userRegister: this.storageService.getCurrentSession().User.IdUsuario,
          productGrid: this.listProductGrid
        };

        const dialogProcessComprobante = this.dialogComprobante.open(DialogEmitirComprobanteComponent, {
          width: '400px',
          data: dataSet,
          hasBackdrop: true
        });

        var resultDialog: any = await dialogProcessComprobante.afterClosed().toPromise();
        this.ListaMesasTotal = await this.mesasService.getAllMesas().toPromise();
        this.limpiarPedido();
        this.MostrarOcultarPanelMesa = true;
        this.MostrarOcultarPanelProducto = false;
      } else {
        alert('No guardo todos los productos de la grilla.')
      }
    } else {
      alert('Debe tener todo el pedido guardado.')
    }
  }

  public async RehacerPantalla() {
    try {
      this.spinnerService.show();
  
      this.ListaMesasTotal = await this.mesasService.getAllMesas().toPromise();
      this.limpiarPedido();
      this.MostrarOcultarPanelMesa = true;
      this.MostrarOcultarPanelProducto = false;
      this.RehacerPantallaRefresh = 'Refresh';
    } catch (_) {

      Swal.fire(
        'Good job!',
        'Error interno, actualice.',
        'error'
      )
    } finally {
      this.spinnerService.hide();
    }

  }

  private getMozoByMozoId(idMozo: string): Empleado {
    let result: Empleado;
    this.ListaEmpleados.forEach(Mozo => {
      if (idMozo === Mozo.IdEmpleado) {
        result = Mozo;
      }
    });

    return result;
  }

  private getTotalByListProductGrid(): number {

    var cantidad: number = 0;

    this.listProductGrid.forEach(productGrid => {
      cantidad = cantidad + productGrid.Subtotal;
    });

    return cantidad;
  }

  private limpiarPedido(): void {
    this.listProductGrid = [];
    this.GridListaPedidoDetProducto.data = this.listProductGrid;
    this.GridListaPedidoDetProducto.data = [];
    this.mozoSelected = new Empleado;
    this.mesaSelected = new Mesas;
    this.pedidoId = 0;
    this.horaPedido = '';
  }

  private getProductGridByResponse(listData: any[]): ProductGrid[] {

    var productGrid: ProductGrid;
    var result: ProductGrid[] = [];
    listData.forEach(data => {
      productGrid = new ProductGrid(
        data.Item, data.IdPedido, data.IdProducto, data.NombreCorto, data.Precio, data.Cantidad, data.Cantidad * data.Precio, data.observacion
      );
      result.push(productGrid);
    });

    return result;
  }

  private getPedidoDetByResponse(listData: any[]): PedidoDet[] {

    var oPedidoDet: PedidoDet;
    var result: PedidoDet[] = [];
    listData.forEach(data => {
      oPedidoDet = new PedidoDet(
        {
       Item: data.Item, 
        IdPedido: data.IdPedido, 
        // Producto: Product{data.IdProducto, data.NombreCorto}, 
        Precio : data.Precio, 
        Cantidad: data.Cantidad, 
        Subtotal: data.Cantidad * data.Precio, 
        Observacion: data.observacion,
        Ip: data.Ip
      }
      );
      result.push(oPedidoDet);
    });

    return result;
  }

  private rellenarHeaderPedido(listData: any[]): void {
    var firstItem = listData[0];
    this.mozoSelected = this.getMozoByMozoId(firstItem.IdEmpleado);
    this.pedidoId = firstItem.IdPedido;
    this.horaPedido = firstItem.HoraPedido;
  }
  private Refresh(): void {
    this.productService.getAllProducts().subscribe(data => {
      this.listProducts = data;
    });

    this.mesasService.getAllMesas().subscribe(data => {
      this.ListaMesasTotal = data;
      let result: Ambiente;
      result = this.listAmbiente.find(item => item.Estado == 1);
      this.MostrarMesas_x_Ambiente(result);
    });
  }




  RehacerRefresh(): void {

    try {
      this.spinnerService.show();

      if (this.RehacerPantallaRefresh === 'Refresh') {
        this.Refresh();
      }
      if (this.RehacerPantallaRefresh === 'RehacerPantalla') {
        this.RehacerPantalla();
      }
    } catch (error) {

    } finally {
      this.spinnerService.hide();
    }




  }



}