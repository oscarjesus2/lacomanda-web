import { Component, OnInit, ViewChild, inject, HostListener, AfterViewInit, ElementRef, ChangeDetectorRef  } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';


import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NgxSpinnerService } from 'ngx-spinner';
import Swal from 'sweetalert2';

//Components
import { DialogDeleteProductComponent } from '../../components/dialog-delete-product/dialog-product-delete.component';
import { DialogVerPedidoComponent } from '../../components/dialog-ver-pedido/dialog-ver-pedido.component';
import { DialogObservacionComponent } from '../../components/dialog-observacion/dialog-observacion.component';


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
import { HeaderService } from 'src/app/services/header.service';

import { faUtensils, faShoppingBag, faTruck, faSync, faConciergeBell, faEye, faList, faPaperPlane, faReceipt, faTimes, faLock, faRunning, fas } from '@fortawesome/free-solid-svg-icons';
import { ApiResponse } from 'src/app/interfaces/ApiResponse.interface';
import { PedidoMesaDTO } from 'src/app/interfaces/pedidomesaDTO.interface';
import { DialogMCantComponent } from 'src/app/components/dialog-mcant/dialog-mcant.component';
import { DialogComplementosComponent } from 'src/app/components/dialog-complementos/dialog-complementos.component';
import { PedidoComplemento } from 'src/app/models/pedidocomplemento.models';
import { ImpresionDTO } from 'src/app/interfaces/impresionDTO.interface';
import { QzTrayService } from 'src/app/services/qz-tray.service';
import { forkJoin } from 'rxjs';
import { UsuarioService } from 'src/app/services/usuario.service';
import { DialogMTextComponent } from 'src/app/components/dialog-mtext/dialog-mtext.component';
import { AnularProductoYComplementoDTO } from 'src/app/interfaces/anularProductoYComplementoDTO.interface';
import { DialogProductSearchComponent } from 'src/app/components/dialog-product-search/dialog-product-search.component';

@Component({
  selector: 'app-digitacion-mozo',
  templateUrl: './digitacion-mozo.component.html',
  styleUrls: ['./digitacion-mozo.component.css']
})

export class DigitacionMozoComponent implements OnInit, AfterViewInit  {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
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

  constructor(
    private router: Router,
    private storageService: StorageService,
    private productService: ProductService,
    private TurnoService: TurnoService,
    private ambienteService: AmbienteService,
    private mesasService: MesasService,
    private empleadoService: EmpleadoService,
    private ObservacionService: ObservacionService,
    private pedidoService: PedidoService,
    private dialogMesa: MatDialog,
    private dialogComprobante: MatDialog,
    private dialog: MatDialog,
    private spinnerService: NgxSpinnerService,
    private qzTrayService: QzTrayService,
    private familiaService: FamiliaService, 
    private headerService: HeaderService,
    private usuarioService: UsuarioService) {


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

  @HostListener('document:fullscreenchange', ['$event'])
  onFullScreenChange(event: Event) {
    console.log('Fullscreen status changed');
  }

  private shouldScroll: boolean = false;

  ngAfterViewInit() {
    this.scrollToBottom(); // Intentamos hacer scroll cuando la vista se carga
    
  }

  ngAfterViewChecked() {
    // Solo hacemos scroll si los datos han cambiado o es necesario
      if (this.shouldScroll) {
    setTimeout(() => {
      this.scrollToBottom();
      this.selectLastRow();
      this.shouldScroll = false;
    });
  }
  }

  scrollToBottom(): void {
    try {
      setTimeout(() => {
        const container = this.scrollContainer.nativeElement;

        // Verificamos si el scrollHeight es mayor que el clientHeight para permitir el scroll
        if (container.scrollHeight > container.clientHeight) {
          container.scrollTop = container.scrollHeight; // Desplazamos el scroll al final
        }
      }, 100); // Esperamos 100 ms para asegurarnos de que el contenido esté renderizado
    } catch (err) {
      console.error('Error al hacer scroll:', err);
    }
  }

  selectLastRow(): void {
    // Verifica si hay datos en la tabla
    if (this.gridListaPedidoDetProducto.data.length > 0) {
      this.selectedRow = this.gridListaPedidoDetProducto.data[this.gridListaPedidoDetProducto.data.length - 1]; // Seleccionamos la última fila
    }
  }

  selectRow(row: any) {
    this.selectedRow = row; // Asigna la fila seleccionada a la propiedad
  }

  enterFullScreen() {
    const elem = document.documentElement;
  
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else {
      console.warn("Pantalla completa no es soportada por este navegador.");
    }
  }

  async ngOnInit() {
    this.enterFullScreen();
    // // const isRunning = await this.qzTrayService.isQzTrayRunning();
    // // if (!isRunning) {
    // //   // Redirige a una página que instruya al usuario a descargar QZ Tray
    // //   this.router.navigate(['/qz-tray-required']);
    // // } 

    this.spinnerService.show();
    this.headerService.hideHeader(); // Ocultar el header al entrar
    try {

 
      await this.TurnoService.ObtenerTurnoByIP(this.storageService.getCurrentIP()).subscribe(data => {
        if (data != null) {
          this.turnoAbierto = data;
        } else {
          Swal.fire({
            icon: 'warning',
            title: 'No hay un turno abierto para ' + this.storageService.getCurrentIP(),
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
    this.IdSubFamila = oSubFamilia.IdSubFamilia;
    this.listProducts_x_SubFamilia = this.listProducts.filter(x => x.IdSubFamilia === oSubFamilia.IdSubFamilia && x.Posicion>0);
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
    this.spinnerService.show();
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
      

    } 
    else {
      const listData: ApiResponse<PedidoMesaDTO[]> = await this.pedidoService.findPedidoMesaByIdMesa(mesa.IdMesa).toPromise();
      if (listData.Data.length > 0) {
        this.mesaSelected = mesa;
        this.rellenarHeaderPedido(listData.Data);
        this.listProductGrid = this.getPedidoDetByResponse(listData.Data);
        this.actualizarDatosGrilla();
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

    this.sumaTotal = parseFloat((totalAux - desctoAux).toFixed(2));
    this.sumaDscto = parseFloat(desctoAux.toFixed(2));
    this.sumaImporte = parseFloat(totalAux.toFixed(2));
    this.sumaImpuestoBolsa = parseFloat(impuestoBolsa.toFixed(2));
    this.sumaGranTotal = parseFloat((this.sumaTotal + impuestoBolsa).toFixed(2));
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
          width: '600px',
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

  async restarProductGrid(pedidoDet: PedidoDet) {


    if (pedidoDet.Cantidad > 1) {
      pedidoDet.Cantidad -= 1;
      if (pedidoDet.Producto.EsProductoBolsa)
        {
            pedidoDet.Impuesto1 = pedidoDet.Producto.ImpuestoBolsa * pedidoDet.Cantidad ;
        }
    
        var dSubDescuento = (pedidoDet.MontoDescuento / pedidoDet.Cantidad);
        var dSubtotal = pedidoDet.Cantidad * pedidoDet.Precio;
    
        pedidoDet.Subtotal = (dSubtotal) - (pedidoDet.Cantidad * dSubDescuento);
        pedidoDet.MontoDescuento = (dSubDescuento * pedidoDet.Cantidad);
        this.calcularTotales();
    }else {
      var removeIndex = this.listProductGrid.map(function (item) { return item }).indexOf(pedidoDet);
      this.listProductGrid.splice(removeIndex, 1);
      this.actualizarDatosGrilla();

    }

  }

  actualizarDatosGrilla() {
    this.gridListaPedidoDetProducto.data = this.listProductGrid;  // Actualizamos la fuente de datos
    this.shouldScroll = true;  // Activamos el scroll para el siguiente ciclo de detección de cambios
    this.calcularTotales();
  } 
  
  async realizarEliminacion(pedidoDet: PedidoDet, motivoAnulacion: string, idUsuAnula: number) {

    var pedidoDelete: AnularProductoYComplementoDTO = {
        IdMesa: this.mesaSelected.IdMesa,
        NroCuenta: pedidoDet.NroCuenta, 
        UsuAnula :  idUsuAnula,
        MotivoAnula :  motivoAnulacion,
        IdPedido : pedidoDet.IdPedido,
        IdProducto : pedidoDet.Producto.IdProducto,
        Item : pedidoDet.Item,
        Ip : this.storageService.getCurrentIP()
      };

    this.spinnerService.show();
    var responseService: ApiResponse<ImpresionDTO[]> = await this.pedidoService.AnularProductoYComplemento(pedidoDelete).toPromise();

    if (responseService.Success == true) {
      const contador = await this.imprimir(responseService.Data);
      
      if (contador === responseService.Data.length) {
        const pedido = responseService.Data[0];
        this.pedidoService.ActualizarNumAnulaImpresion(pedido.IdPedido, pedido.Item).subscribe(response => {
          console.log('Envios actualizados correctamente', response);
        }, error => {
          console.error('Error al actualizar los envíos', error);
        });
      }

      var removeIndex = this.listProductGrid.map(function (item) { return item }).indexOf(pedidoDet);
      this.listProductGrid.splice(removeIndex, 1);
      this.actualizarDatosGrilla();
      if (this.listProductGrid.length == 0) {
        this.limpiarPedido();
        this.RehacerPantalla();
      }
    }
    this.spinnerService.hide();
  }
  
  deleteProductGrid(pedidoDet: PedidoDet) {
    const currentUser = this.storageService.getCurrentUser();

    if (currentUser.IdNivel === '001') {
      // Usar DialogMTextTouchComponent para el motivo de anulación
      const dialogRef = this.dialog.open(DialogMTextComponent, {
        width: '435px',
        data: { title: `¿Está seguro de eliminar el producto ${pedidoDet.Producto.NombreCorto}?` }
      });
  
      dialogRef.afterClosed().subscribe(result => {

        if (result && result.value) {
          const motivoAnulacion = result.value;
          this.realizarEliminacion(pedidoDet, motivoAnulacion, this.storageService.getCurrentSession().User.IdUsuario);
        }
      });
    } else {
      // Si el usuario no es de nivel "001", pedir primero el código del administrador con DialogMCantComponent
      const dialogRef = this.dialog.open(DialogMCantComponent, {
        width: '350px',
        data: {
          title: 'Ingresar Código de Administrador',
          hideNumber: true,
          decimalActive: false
        }
      });
  
      dialogRef.afterClosed().subscribe(result => {
        if (result && result.value) {
          const codigoAdmin = result.value;
          // Validar el código del administrador llamando a la API
          this.usuarioService.getUsuario('001',codigoAdmin).subscribe((response: ApiResponse<Usuario>) => {
            if (response.Success) 
            { 
              if (response.Data) {
              // Mostrar el DialogMTextTouchComponent para el motivo de anulación
              const motivoRef = this.dialog.open(DialogMTextComponent, {
                width: '435px',
                data: { title: `¿Está seguro de eliminar el producto ${pedidoDet.Producto.NombreCorto}?` }
              });
  
              motivoRef.afterClosed().subscribe(result => {
                     
                if (result && result.value) {
                  const motivoAnulacion = result.value;
                                             
                  this.realizarEliminacion(pedidoDet, motivoAnulacion, response.Data.IdUsuario);
                }
              });
              } else {
                    
              Swal.fire({
                title: 'Código inválido',
                text: 'El código ingresado no es correcto.',
                icon: 'error',
                confirmButtonText: 'OK'
              });
            }
          }
          });
        }
      });
    }
  }
  

 
  public AgregarProducto(product: Product): void {
  
    // Verificar si el producto tiene el flag SinPrecio
    if (product.SinPrecio == 1) {
      const dialogRef = this.dialog.open(DialogMCantComponent, {
        width: '350px',
        data: {
          title: 'Ingresar Precio',
          hideNumber: false, // Mostrar los números
          decimalActive: true // Activar el punto decimal si el precio permite decimales
        }
      });
  
      dialogRef.afterClosed().subscribe((result) => {
        // Si se ingresó un valor de precio
        if (result && result.value) {
          const precioIngresado = result.value;
          product.Precio = precioIngresado;
  
          // Llamar a la lógica para agregar el producto solo si se ingresó el precio
          this.procesarAgregarProducto(product);
        }
      });
    } else {
      // Si SinPrecio no es igual a 1, agrega el producto directamente
      this.procesarAgregarProducto(product);
    }
  }
  
  private procesarAgregarProducto(product: Product): void {
    // Crear el detalle del pedido con el precio y la cantidad
    const pedidoDet = new PedidoDet({
      Item: this.DEFAULT_ID,
      IdPedido: this.pedidoId == 0 ? this.DEFAULT_ID : this.pedidoId,
      NroCuenta: this.nroCuenta == 0 ? this.DEFAULT_ID : this.nroCuenta,
      Producto: new Product(product),
      PedidoComplemento: [],
      Precio: product.Precio,
      Cantidad: 1,
      Subtotal: 1 * product.Precio,
      Observacion: '',
      MontoDescuento: 0,
      Impuesto1: 0,
      Ip: this.storageService.getCurrentIP()
    });
  
    // Verificar si el producto tiene complementos
    if (product.Tipo == 2) {
      this.AgregarProductoComplemento(pedidoDet);
    }
  
    // Agregar el producto al grid de productos
    this.listProductGrid.push(pedidoDet);
    this.actualizarDatosGrilla();
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
            
        }
      } else {
        if (pedidodet.Item==0)
          {
          var removeIndex = this.listProductGrid.map(function (item) { return item }).indexOf(pedidodet);
          this.listProductGrid.splice(removeIndex, 1);
          this.actualizarDatosGrilla();
        }
      }
    });
  }

  openProductSearch(): void {
    const dialogRef = this.dialog.open(DialogProductSearchComponent, {
      width: '970px',
      height: '820px',
      data: { listProducts: this.listProducts }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.AgregarProducto(result);
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

    
  }

  VerPedido(){
    if (this.selectedRow.PedidoComplemento.length==0){
      return;
    }
    this.AgregarProductoComplemento(this.selectedRow);
  }

  async ImprimirPrecuenta(){
    if (this.mesaSelected.IdMesa == null){
      Swal.fire(
        'Procesar Pedido',
        'Debe seleccionar una mesa.',
        'info'
      );
      return;
    }

    var responseRegisterPedido: ApiResponse<ImpresionDTO[]> = await this.pedidoService.ImprimirPrecuenta(this.pedidoId, this.nroCuenta).toPromise();

    if (responseRegisterPedido.Success) {
      this.imprimir(responseRegisterPedido.Data);
    }
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

        var responseRegisterPedido: ApiResponse<ImpresionDTO[]> = await this.pedidoService.RegistrarPedido(pedido).toPromise();

        if (responseRegisterPedido.Success) {

          this.imprimirPedido(responseRegisterPedido);
          this.limpiarPedido();
          this.procesarPedido=false;
          this.RehacerPantalla();

          this.MostrarOcultarPanelMesa = true;
          this.MostrarOcultarPanelProducto = false;
        }
        this.spinnerService.hide();
      } else {
        Swal.fire('Oops...', 'No ha ingresado ningun producto.', 'error')
      }

  }

  async imprimirPedido(responseRegisterPedido: ApiResponse<ImpresionDTO[]> ){
    const contador = await this.imprimir(responseRegisterPedido.Data);

    if (contador === responseRegisterPedido.Data.length) {
      const pedido = responseRegisterPedido.Data[0];
      this.pedidoService.ActualizarEnviosDeImpresion(pedido.IdPedido, pedido.NroCuenta).subscribe(response => {
        console.log('Envios actualizados correctamente', response);
      }, error => {
        console.error('Error al actualizar los envíos', error);
      });
    }
  }


  async imprimir(listImpresionDTO: ImpresionDTO[]): Promise<number> {
    let contador: number = 0;
  
    for (const element of listImpresionDTO) {
      const printerName = element.NombreImpresora; 
      const success = await this.qzTrayService.printPDF(element.Documento, printerName);
      if (success) {
        contador += 1;
      }
    }
   return contador;
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
      this.enterFullScreen();
      await this.mesasService.getAllMesas().subscribe(data => {
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
    this.actualizarDatosGrilla();
    this.gridListaPedidoDetProducto.data = [];
    this.mozoSelected = new Empleado;
    this.mesaSelected = new Mesas;
    this.procesarPedido= false;
    this.pedidoId = 0;
    this.nroCuenta= 0;
    this.horaPedido = '';
    this.mesaSelected.NroPersonas = 0;
    
  }

  
  private getPedidoDetByResponse(listData: PedidoMesaDTO[]): PedidoDet[] {

    var oPedidoDet: PedidoDet;
    var result: PedidoDet[] = [];
    listData.forEach(data => {
      oPedidoDet = new PedidoDet(
        {
        Item: data.Item, 
        NroCuenta: data.NroCuenta,
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
    this.mesaSelected.NroPersonas = firstItem.NroPax;
    this.mozoSelected = this.getMozoByMozoId(firstItem.IdEmpleado);
    this.pedidoId = firstItem.IdPedido;
    this.nroCuenta = firstItem.NroCuenta;
    this.horaPedido = firstItem.HoraPedido;
  }
  Refresh(): void {
    this.spinnerService.show();
  
    forkJoin([
      this.productService.getAllProducts(),
      this.mesasService.getAllMesas()
    ]).subscribe(([productsData, mesasData]) => {
      this.listProducts = productsData;
      this.ListaMesasTotal = mesasData;
      let result: Ambiente;
      result = this.listAmbiente.find(item => item.Estado == 1);
      this.MostrarMesas_x_Ambiente(result);

      this.spinnerService.hide();  // Ocultamos el spinner una vez que ambas solicitudes han terminado
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