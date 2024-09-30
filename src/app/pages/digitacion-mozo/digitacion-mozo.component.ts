import { Component, OnInit, ViewChild, inject, HostListener  } from '@angular/core';
import { Breakpoints, BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';


import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatMenuTrigger } from '@angular/material/menu';
import { NgxSpinnerService } from 'ngx-spinner';
import Swal from 'sweetalert2';

//Components
import { DialogDeleteProductComponent } from '../../components/dialog-delete-product/dialog-product-delete.component';
import { DialogVerPedidoComponent } from '../../components/dialog-ver-pedido/dialog-ver-pedido.component';
import { DialogObservacionComponent } from '../../components/dialog-observacion/dialog-observacion.component';


//Models
import { PedidoDelete } from '../../models/pedido.delete.models';
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
import { Usuario } from '../../models/user.models';

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
import { HeaderService } from 'src/app/services/header.service';

import { faUtensils, faShoppingBag, faTruck, faSync, faConciergeBell, faEye, faList, faPaperPlane, faReceipt, faTimes, faLock, faRunning, fas } from '@fortawesome/free-solid-svg-icons';
import { ApiResponse } from 'src/app/interfaces/ApiResponse.interface';
import { PedidoMesaDTO } from 'src/app/interfaces/pedidomesaDTO.interface';
import { DialogMCantComponent } from 'src/app/components/dialog-mcant/dialog-mcant.component';
import { DialogComplementosComponent } from 'src/app/components/dialog-complementos/dialog-complementos.component';
import { PedidoComplemento } from 'src/app/models/pedidocomplemento.models';

@Component({
  selector: 'app-digitacion-mozo',
  templateUrl: './digitacion-mozo.component.html',
  styleUrls: ['./digitacion-mozo.component.css']
})

export class DigitacionMozoComponent implements OnInit {

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
  public nroCuenta: number = 0;

  public horaPedido: string = "";
  public userLoged: any = { id: "", username: "" };

  public listProductGrid: PedidoDet[] = [];
  public gridListaPedidoDetProducto = new MatTableDataSource<PedidoDet>();
  // public ListaPedidoDetProducto: PedidoDet[] = [];

  public MostrarOcultarPanelProducto: Boolean;
  public MostrarOcultarPanelMesa: Boolean;
  public MostrarOcultarPanelPedido: Boolean;
  public mozoSelected: Empleado;
  public mesaSelected: Mesas;

  public RehacerPantallaRefresh: string = "";
  selectedItemFamilia: any = null;
  selectedItemSubFamilia: any = null;

  isCanalVentaDisabled = false;
  isBusquedaDisabled = false;
  isPanelProductoDisabled = false;
  isComboDisabled = false;
  isVerComplementoDisabled = false;
  isPriorizarDespachoDisabled = false;
  isEnviarPedidoDisabled = false;

  isPrecuentaDisabled = false;
  isAnularPedidoDisabled = false;
  isReImprimirDisabled = false;
  isBloquearDisabled = false;
  selectedRow: any;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  procesarPedido: boolean = false;

  ngAfterViewInit() {

    this.gridListaPedidoDetProducto.paginator = this.paginator;
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
    private dialog: MatDialog,
    private dialogEmisionComprobante: MatDialog,
    private spinnerService: NgxSpinnerService,
    private familiaService: FamiliaService, private headerService: HeaderService) {


    this.MostrarOcultarPanelMesa = true;
    this.MostrarOcultarPanelProducto = false;
    this.mozoSelected = new Empleado;
    this.mesaSelected = new Mesas;
    this.MostrarOcultarPanelPedido = false;
    this.RehacerPantallaRefresh = 'Refresh';


  }

  sumaTotal: number = 0;
  sumaDscto: number = 0;
  sumaImporte: number = 0;
  sumaImpuestoBolsa: number = 0;
  sumaGranTotal: number = 0;

  faUtensils = faUtensils;
  faShoppingBag = faShoppingBag;
  faTruck = faTruck;
  faSync = faSync;
  faConciergeBell = faConciergeBell;
  faEye = faEye;
  faList = faList;
  faPaperPlane = faPaperPlane;
  faReceipt = faReceipt;
  faTimes = faTimes;
  faLock = faLock;
  faRunning = faRunning ;
  mesas: { name: string; active: boolean; price: number, indice: number }[] = [];
  toggleBloquear() {
    if (!this.procesarPedido) {
      this.salir(); // Llamar a la función salir si está visible el botón Bloquear
    } else {
      this.RehacerPantalla(); // Llamar a la función Rehacer si está visible el botón Rehacer
    }
  }

  ngOnDestroy() {
    this.headerService.showHeader(); // Mostrar el header al salir
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

  selectRow(row: any) {
    this.selectedRow = row; // Asigna la fila seleccionada a la propiedad
  }

  async ngOnInit() {
    this.enterFullScreen();
    this.spinnerService.show();
    this.headerService.hideHeader(); // Ocultar el header al entrar
    try {

 
      await this.TurnoService.ObtenerTurnoByIP(this.storageService.getCurrentIP()).subscribe(data => {
        if (data != null) {
          this.turnoAbierto = data;
        } else {
          Swal.fire({
            icon: 'warning',
            title: 'No hay un turno abierto',
            text: 'El componente se cerrará.',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            this.storageService.logout();
          });
        }
      });

      // 1. Se carga servicio para obtener productos
      this.listProducts = await this.productService.getAllProducts().toPromise();
      // 2. Se carga servicio para obtener mesas
      this.ListaMesasTotal = await this.mesasService.getAllMesas().toPromise();
      // 3. Se carga servicio para obtener Mozos
      const response = await this.empleadoService.getAllEmpleados().toPromise();
      this.ListaEmpleados = response.Data; // Asegúrate de asignar solo el array de empleados
      // 4. Se carga servicio para obtener ambientes
      this.listAmbiente = await this.ambienteService.getAllAmbiente().toPromise();
      // 5. Se carga combo familia
      this.listFamilia = await this.familiaService.getFamilia().toPromise();
      // 6. Se carga la sub familia
      this.listSubFamilia = await this.familiaService.getSubFamilia().toPromise();
      // 7. Se carga servicio observacion
      this.ListaObservacion = await this.ObservacionService.getAllObservacion().toPromise();

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
    this.selectedItemFamilia = oFamilia;
    this.spinnerService.show();
    this.listProducts_x_SubFamilia = [];
    this.listSubFamilia_x_Familia = this.listSubFamilia.filter(x => x.IdFamilia === oFamilia.IdFamilia);
    let oSubFamilia = this.listSubFamilia_x_Familia.find((item) => (item.IdFamilia === oFamilia.IdFamilia));
    this.ListarProductos_x_SubFamilia(oSubFamilia);
    this.spinnerService.hide();
  }

  async ListarProductos_x_SubFamilia(oSubFamilia: SubFamilia) {
    this.spinnerService.show();
    this.selectedItemSubFamilia = oSubFamilia;
    console.log(this.listProducts);
    this.IdSubFamila = oSubFamilia.IdSubFamilia;
    this.listProducts_x_SubFamilia = this.listProducts.filter(x => x.IdSubFamilia === oSubFamilia.IdSubFamilia);
    //this.GridListaPedidoDetProducto.data = this.ListaPedidoDetProducto.filter(x=> x.IdSubFamilia===subFamiliaId);
    this.spinnerService.hide();
  }

  ingresarCodigoCortesia(oPedidoDet: PedidoDet) {
    if (oPedidoDet.NroCupon) {
      // Si ya hay un código ingresado, mostrarlo en un SweetAlert con opción de eliminarlo
      Swal.fire({
        title: 'Código de cortesía ingresado',
        text: `El código ingresado es: ${oPedidoDet.NroCupon}`,
        showCancelButton: true,
        confirmButtonText: 'Eliminar código',
        cancelButtonText: 'Mantener código'
      }).then((result) => {
        if (result.isConfirmed) {
          // Eliminar el código
          oPedidoDet.NroCupon = "";
          Swal.fire({
            title: 'Código eliminado',
            icon: 'success',
            confirmButtonText: 'OK'
          });
        }
      });
    } else {
      // Si no hay código ingresado, abrir el diálogo para ingresar uno nuevo
      const dialogRef = this.dialog.open(DialogMCantComponent, {
        width: '350px',
        data: {
          title: 'Ingresar Código de Cortesía',
          hideNumber: false, // Mostrar los números
          decimalActive: false, // Desactivar el punto decimal si solo se permiten enteros
        }
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result && result.value) {
          const codigoIngresado = result.value;
          oPedidoDet.NroCupon = codigoIngresado;
          oPedidoDet.IdDescuento= "001";
        }
      });
    }
  }
  
  ingresarCodigosAnfitrionas(oPedidoDet: PedidoDet) {
    let codigoCounter = 1;  // Para llevar el control del número de códigos ingresados
    const codigosAnfitriona: string[] = [];  // Almacena los códigos ingresados

    Swal.fire({
      title: 'Ingresar códigos de Anfitrionas',
      html: `
        <div id="inputs-container">
          <div id="codigo-div1">
            <input type="text" id="codigo1" class="swal2-input" placeholder="Código 1" readonly>
            <button type="button" class="remove-btn" id="remove1">Eliminar</button>
          </div>
        </div>
        <button id="add-more" type="button" class="swal2-confirm swal2-styled" style="margin-top: 10px;">Agregar más</button>
      `,
      focusConfirm: false,
      preConfirm: () => {
        // Recoger todos los inputs que contengan códigos
        const codigos: string[] = [];
        for (let i = 1; i <= codigoCounter; i++) {
          const inputDiv = document.getElementById(`codigo-div${i}`);
          if (inputDiv) {  // Asegurarse de que el div existe (si no ha sido eliminado)
            const codigoInput = (document.getElementById(`codigo${i}`) as HTMLInputElement).value;
            if (codigoInput) {
              codigos.push(`ANFITRIONA ${codigoInput}`); // Agregar el prefijo "ANFITRIONA"
            }
          }
        }
        return codigos;  // Devuelve la lista de códigos con el prefijo
      },
      didOpen: () => {
        // Manejar la lógica para agregar más inputs cuando se presiona "Agregar más"
        const addMoreButton = document.getElementById('add-more');
        addMoreButton?.addEventListener('click', () => {
          codigoCounter++;
          const inputsContainer = document.getElementById('inputs-container');
          if (inputsContainer) {
            const newDiv = document.createElement('div');
            newDiv.id = `codigo-div${codigoCounter}`;
            newDiv.innerHTML = `
              <input type="text" id="codigo${codigoCounter}" class="swal2-input" placeholder="Código ${codigoCounter}" readonly>
              <button type="button" class="remove-btn" id="remove${codigoCounter}">Eliminar</button>
            `;
            inputsContainer.appendChild(newDiv);

            // Agregar evento de eliminación al nuevo botón
            const removeButton = document.getElementById(`remove${codigoCounter}`);
            removeButton?.addEventListener('click', () => {
              document.getElementById(`codigo-div${codigoCounter}`)?.remove();
            });

            // Abrir el teclado numérico personalizado para ingresar el nuevo código
            this.openDialogMCant(codigoCounter);
          }
        });

        // Abrir el teclado numérico para el primer código
        this.openDialogMCant(1);
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const codigos = result.value?.join(', '); // Convertir la lista en una cadena separada por comas
        oPedidoDet.Anfitriona = codigos;
      }
    });
  }

  openDialogMCant(codigoIndex: number) {
    // Ocultar el contenedor de SweetAlert2 antes de abrir el diálogo
    const swalContainer = document.querySelector('.swal2-container') as HTMLElement;
    if (swalContainer) {
      swalContainer.style.display = 'none';  // Ocultar temporalmente SweetAlert2
    }
  
    // Abrir el DialogMCantComponent para ingresar el código
    const dialogRef = this.dialog.open(DialogMCantComponent, {
      width: '350px',
      data: {
        title: `Ingresar Código de Anfitriona ${codigoIndex}`,
        hideNumber: false,
        decimalActive: false
      }
    });
  
    dialogRef.afterClosed().subscribe((result) => {
      // Volver a mostrar el contenedor de SweetAlert2 después de cerrar el diálogo
      if (swalContainer) {
        swalContainer.style.display = 'block';  // Restaurar la visibilidad de SweetAlert2
      }
  
      if (result && result.value) {
        const inputElement = document.getElementById(`codigo${codigoIndex}`) as HTMLInputElement;
        if (inputElement) {
          inputElement.value = result.value;  // Asignar el valor ingresado al input correspondiente
        }
      }
    });
  }

  

  async openDialogMesa(mesa: Mesas) {

    this.limpiarPedido();

    if (mesa.Ocupado == 0 || mesa.Ocupado == 2) {
      this.mesaSelected = mesa;
      this.mozoSelected = this.getMozoByMozoId(this.storageService.getCurrentSession().User.IdEmpleado);

        // Abrir el DialogMCantComponent para ingresar el código
    const dialogRef = this.dialog.open(DialogMCantComponent, {
      width: '350px',
      data: {
        title: 'Ingrese Nro Pax',
        hideNumber: false,
        decimalActive: false
      }
    });
  
    dialogRef.afterClosed().subscribe((result) => {

      if (result && result.value) {
            if (!result.value || result.value <= 0) {
              return 'Debe ingresar un número válido mayor que 0';
            }else{
              const nroPax = result.value;
              this.mesaSelected.NroPersonas = nroPax;
              this.processPedido(true);
            }
      }
    });
      

    } else {
      const listData: ApiResponse<PedidoMesaDTO[]> = await this.pedidoService.findPedidoMesaByIdMesa(mesa.IdMesa).toPromise();
      if (listData.Data.length > 0) {
        this.rellenarHeaderPedido(listData.Data);
        this.listProductGrid = this.getPedidoDetByResponse(listData.Data);
        console.log(this.listProductGrid);
        this.gridListaPedidoDetProducto.data = this.listProductGrid;
        this.calcularTotales();
        this.mesaSelected = mesa;

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

  calcularTotales(): void {
    let totalAux = 0;
    let desctoAux = 0;
    let impuestoBolsa = 0;

    this.gridListaPedidoDetProducto.data.forEach(item => {
      totalAux += item.Subtotal;
      desctoAux += item.MontoDescuento;
      impuestoBolsa += item.Impuesto1;
    });

    this.sumaTotal = totalAux - desctoAux;
    this.sumaDscto = desctoAux;
    this.sumaImporte = totalAux;
    this.sumaImpuestoBolsa = impuestoBolsa;
    this.sumaGranTotal = this.sumaTotal + impuestoBolsa;
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
          data: { oPedidoMesa: listData.Data, IdMesa: IdMesa, Mesa: this.mesaSelected.Descripcion + ' ' + this.mesaSelected.Numero }
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
    
    if (oPedidoDet.Producto.EsProductoBolsa)
    {
        oPedidoDet.Impuesto1 = oPedidoDet.Producto.ImpuestoBolsa * oPedidoDet.Cantidad ;
    }

    var dSubDescuento = (oPedidoDet.MontoDescuento / oPedidoDet.Cantidad);
    var dSubtotal = oPedidoDet.Cantidad * oPedidoDet.Precio;

    oPedidoDet.Subtotal = (dSubtotal) - (oPedidoDet.Cantidad * dSubDescuento);
    oPedidoDet.MontoDescuento = (dSubDescuento * oPedidoDet.Cantidad);

    this.calcularTotales();
  }

  async restarProductGrid(oPedidoDet: PedidoDet) {


    if (oPedidoDet.Cantidad > 1) {
      oPedidoDet.Cantidad -= 1;
      if (oPedidoDet.Producto.EsProductoBolsa)
        {
            oPedidoDet.Impuesto1 = oPedidoDet.Producto.ImpuestoBolsa * oPedidoDet.Cantidad ;
        }
    
        var dSubDescuento = (oPedidoDet.MontoDescuento / oPedidoDet.Cantidad);
        var dSubtotal = oPedidoDet.Cantidad * oPedidoDet.Precio;
    
        oPedidoDet.Subtotal = (dSubtotal) - (oPedidoDet.Cantidad * dSubDescuento);
        oPedidoDet.MontoDescuento = (dSubDescuento * oPedidoDet.Cantidad);
        this.calcularTotales();
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

        var pedidoDelete: PedidoDelete = new PedidoDelete(
          this.storageService.getCurrentSession().User.IdUsuario,
          resultDialog.motivoAnulacion,
          oPedidoDet.IdPedido,
          oPedidoDet.Producto.IdProducto,
          oPedidoDet.Item);

        this.spinnerService.show();
        var responseService: ResponseService = await this.pedidoService.deletePedido(pedidoDelete).toPromise();
        var cofigoOk: number = 200;

        if (responseService.Codigo == cofigoOk) {
          var removeIndex = this.listProductGrid.map(function (item) { return item }).indexOf(oPedidoDet);
          this.listProductGrid.splice(removeIndex, 1);
          this.gridListaPedidoDetProducto.data = this.listProductGrid;
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
      this.gridListaPedidoDetProducto.data = this.listProductGrid;
    }
    this.calcularTotales();
  }
 
  public AgregarProducto(product: Product): void {

    var pedidoDet= new PedidoDet({
      Item: this.DEFAULT_ID,
      IdPedido: this.pedidoId == 0 ? this.DEFAULT_ID : this.pedidoId,
      NroCuenta: this.nroCuenta == 0 ? this.DEFAULT_ID : this.nroCuenta,
      Producto: new Product(product),
      PedidoComplemento: [],
      Precio: product.Precio,
      Cantidad: 1,
      Subtotal: 1 * product.Precio,
      Observacion: '',
      MontoDescuento:0,
      Impuesto1:0,
      Ip: this.storageService.getCurrentIP()}
    )
    if (product.Tipo==2)
      {
        this.AgregarProductoComplemento(pedidoDet)
      }
      this.listProductGrid.push(pedidoDet);
    this.gridListaPedidoDetProducto.data = this.listProductGrid;
    this.calcularTotales();
  }
  
  AgregarProductoComplemento(pedidodet: PedidoDet) {

    const dialogRef = this.dialog.open(DialogComplementosComponent, {
      hasBackdrop: true,
      width: '880px',
      height:'630px',
      data: {
        pedidodet: pedidodet,
        listProducts: this.listProducts
      }
    });

    dialogRef.afterClosed().subscribe((item) => {
      if (item) {
        if (item.pedidodet.Item>0)
        {
            const iCantidad = item.pedidodet.Cantidad;
            const dPrecio = item.pedidodet.Precio;
            const dSubtotal = iCantidad * dPrecio;

            item.pedidodet.Cantidad = iCantidad;
            item.pedidodet.Subtotal = dSubtotal;
            this.calcularTotales();
        }
      } else {
        if (item.pedidodet.Item>0)
        {
          var removeIndex = this.listProductGrid.map(function (item) { return item }).indexOf(pedidodet);
          this.listProductGrid.splice(removeIndex, 1);
          this.gridListaPedidoDetProducto.data = this.listProductGrid;
          this.calcularTotales();
        }  
      }
    });
  }

  async processPedido(esMesaNueva: boolean) {

    if (this.mesaSelected.IdMesa == null){
      Swal.fire(
        'Procesar Pedido',
        'Debe seleccionar una mesa.',
        'info'
      );
      return;
    }
    this.procesarPedido=true;
    
    const listData: ApiResponse<PedidoMesaDTO[]> = await this.pedidoService.findPedidoMesaByIdMesa(this.mesaSelected.IdMesa).toPromise();
    if (listData.Data.length > 0 || (esMesaNueva)) {
      
      this.isAnularPedidoDisabled = true;
      this.isComboDisabled = false;
      this.isVerComplementoDisabled = false;
      this.isReImprimirDisabled = false;
      this.isPrecuentaDisabled = false;
      this.MostrarOcultarPanelMesa=false;
      this.MostrarOcultarPanelProducto=true;
      this.isCanalVentaDisabled =true;
      this.isBusquedaDisabled = false; 
      
      if (this.sumaDscto > 0)
      {
          this.isBusquedaDisabled = true;
          this.isPanelProductoDisabled = true;
      }else
      {
          this.isBusquedaDisabled = false;
          this.isPanelProductoDisabled = false;
      }

      let oFamilia = this.listFamilia[0];
      this.ListarSubFamilia_x_Familia(oFamilia);

    } else 
    {

      Swal.fire(
        'Ups.!',
        'La mesa ya fue cobrada.',
        'warning'
      );
      this.ListaMesasTotal = await this.mesasService.getAllMesas().toPromise();
    }
  }

  VerPedido(){
    if (this.selectedRow.PedidoComplemento.length==0){
      return;
    }
    this.AgregarProductoComplemento(this.selectedRow);
  }

  async EnviarPedido() {
      this.spinnerService.show();
      this.procesarPedido=true;
      if (this.listProductGrid.length > 0) {

        var listPedidoDetails: PedidoDet[] = [];

        this.listProductGrid.forEach(itemGrid => {
          let pedidoDetail: PedidoDet = new PedidoDet(
            {
            Item: itemGrid.Item,
            IdPedido : itemGrid.IdPedido,
            NroCuenta : itemGrid.NroCuenta,
            Producto: itemGrid.Producto,
            Precio: itemGrid.Precio,
            Cantidad: itemGrid.Cantidad,
            Subtotal : itemGrid.Precio*itemGrid.Cantidad,
            Observacion : itemGrid.Observacion,
            Anfitriona: itemGrid.Anfitriona,
            NroCupon: itemGrid.NroCupon,
            IdDescuento: itemGrid.IdDescuento,
            Ip: this.storageService.getCurrentIP(),
            NombreCuenta: itemGrid.NombreCuenta,
            PedidoComplemento: itemGrid.PedidoComplemento
          }
          );
          
          listPedidoDetails.push(pedidoDetail);
        });

        console.log(this.mozoSelected);

        var pedido: PedidoCab = new PedidoCab(
          {
            IdEmpleado: this.mozoSelected?.IdEmpleado,
            IdPedido: this.pedidoId == 0 ? this.DEFAULT_ID : this.pedidoId,
            NroCuenta: this.nroCuenta == 0 ? this.DEFAULT_ID : this.nroCuenta,
            Total: this.getTotalByListProductGrid(),
            Importe: this.getTotalByListProductGrid(),
            UsuReg: this.storageService.getCurrentSession().User.IdUsuario,
            UsuMod: this.storageService.getCurrentSession().User.IdUsuario,
            IdMesa: this.mesaSelected.IdMesa, 
            Mesa: this.mesaSelected.Mesa, 
            NroPax: this.mesaSelected.NroPersonas,
            IdCaja: "001",
            Moneda: "SOL",
            Cliente: "-", /*solo para trago gratis */
            Direccion: "", /*solo para delivery*/
            Referencia: "", /*solo para delivery*/
            IdTipoPedido:"001",
            ListaPedidoDet: listPedidoDetails
        }
        );

        var responseRegisterPedido: any = await this.pedidoService.registerPedido(pedido).toPromise();

        if (responseRegisterPedido) {
       
          this.limpiarPedido();
          this.procesarPedido=false;
          this.Refresh();

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
  
      this.mesasService.getAllMesas().subscribe(data => {
        this.ListaMesasTotal = data;
        let result: Ambiente;
        result = this.listAmbiente.find(item => item.Estado == 1);
        this.MostrarMesas_x_Ambiente(result);
      });

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
    this.gridListaPedidoDetProducto.data = this.listProductGrid;
    this.gridListaPedidoDetProducto.data = [];
    this.mozoSelected = new Empleado;
    this.mesaSelected = new Mesas;
    this.procesarPedido= false;
    this.pedidoId = 0;
    this.nroCuenta= 0;
    this.horaPedido = '';
    this.mesaSelected.NroPersonas = 0;
    this.calcularTotales();
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

  
  private getPedidoDetByResponse(listData: PedidoMesaDTO[]): PedidoDet[] {

    var oPedidoDet: PedidoDet;
    var result: PedidoDet[] = [];
    listData.forEach(data => {
      oPedidoDet = new PedidoDet(
        {
        Item: data.Item, 
        IdPedido: data.IdPedido, 
        Producto: new Product({
          IdProducto: data.IdProducto, 
          NombreCorto: data.NombreCorto,
          ExclusivoParaAnfitriona: data.ExclusivoParaAnfitriona,
          Qty: data.Qty,
          FactorComplemento: data.FactorComplemento,
          PermitirParaTragoCortesia: data.PermitirParaTragoCortesia }),
        Precio : data.Precio, 
        Cantidad: data.Cantidad, 
        Subtotal: data.Subtotal, 
        Anfitriona: data.Anfitriona,
        Observacion: data.Observacion,
        Impuesto1: data.Impuesto1,
        MontoDescuento: data.MontoDescuento,
        NroCupon: data.NroCupon,
        Ip: data.Ip,
        PedidoComplemento: data.PedidoComplemento
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
    this.nroCuenta = firstItem.NroCuenta;
    this.horaPedido = firstItem.HoraPedido;
  }
  Refresh(): void {
    this.productService.getAllProducts().subscribe(data => {
      this.listProducts = data;
    });

    this.mesasService.getAllMesas().subscribe(data => {
      this.ListaMesasTotal = data;
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