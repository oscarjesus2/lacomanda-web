import { Component } from '@angular/core';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import { ImpresionDTO } from 'src/app/interfaces/impresionDTO.interface';
import { EntradasEmitidasService } from 'src/app/services/entradasemitidas.service';
import { QzTrayV224Service } from 'src/app/services/qz-tray-v224.service';
import { StorageService } from 'src/app/services/storage.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import Swal from 'sweetalert2';
import { DialogMCantComponent } from '../dialog-mcant/dialog-mcant.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DialogMTextComponent } from '../dialog-mtext/dialog-mtext.component';
import { Usuario } from 'src/app/models/usuario.models';
import { PedidoCab } from 'src/app/models/pedido.models';
import { PedidoDet } from 'src/app/models/pedidodet.models';
import { TurnoService } from 'src/app/services/turno.service';
import { Turno } from 'src/app/models/turno.models';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { Product } from 'src/app/models/product.models';
import { DescuentoCodigo } from 'src/app/models/descuentocodigo.models';
import { DialogEmitirComprobanteComponent } from '../dialog-emitir-comprobante/dialog-emitir-comprobante.component';
import { EnumTipoDocumento } from 'src/app/enums/enum';
import { DialogPagarTaxistaComponent } from '../dialog-pagar-taxista/dialog-pagar-taxista.component';

@Component({
  selector: 'app-dialog-entradas',
  templateUrl: './dialog-entradas.component.html',
  styleUrls: ['./dialog-entradas.component.css']
})
export class DialogEntradasComponent {
  turnoAbierto: Turno;
  tragosGratis = 0;
  entradaSocios = 0;
  entradaInvitados = 0;
  entradaGratis = 0;
  entradaConsumo = 0;
  entradaXConsumo = 0;
  entradaNacional = 0;
  entradaInternacional = 0;

  selectedButton: string | null = null;
  descuentoNacional: number = 0;
  descuentoInternacional: number = 0;
  nuevoPrecioNacional: any;
  nuevoPrecioInternacional: any;
  total: number = 0;
  descuentoTotal: number = 0;
  subTotal: number = 0;
  iIdUsuarioNacionalAdmin: any;
  iIdUsuarioInterNacionalAdmin: any;
  vinoConTaxista: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<DialogEntradasComponent>,
    private router: Router,
    private storageService: StorageService,
    private entradasemitidasService: EntradasEmitidasService,
    private usuarioService: UsuarioService,
    private dialog: MatDialog,
    private TurnoService: TurnoService,
    private spinnerService: NgxSpinnerService,
    private qzTrayService: QzTrayV224Service) {

  }

  mensajeTaxista: string = "Usted esta indicando que el cliente NO vino con taxista"; // Mensaje inicial

  onTaxistaChange() {
    if (this.vinoConTaxista) {
      this.mensajeTaxista = "Usted esta indicando que el cliente SI vino con taxista";
    } else {
      this.mensajeTaxista = "Usted esta indicando que el cliente NO vino con taxista";
    }
  }
  async ngOnInit() {

    this.spinnerService.show();

    try {
      // Primer servicio que necesita ejecutarse antes de otros
      this.TurnoService.ObtenerTurnoByIP(this.storageService.getCurrentIP()).subscribe(data => {
        if (data != null) {
          this.turnoAbierto = data;
          this.spinnerService.hide();
        } else {
          // Si no hay turno abierto
          this.spinnerService.hide();
          Swal.fire({
            icon: 'warning',
            title: 'No hay un turno abierto para ' + this.storageService.getCurrentIP(),
            text: 'El componente se cerrará.',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            if (this.storageService.getCurrentUser().IdNivel == "001") {
              this.router.navigate(['/dashboard']);
            } else {
              this.storageService.logout();
            }
          });
        }
      });

    } catch (error) {
      this.spinnerService.hide();
      this.salir();
    }
  }


  // Método para seleccionar el botón e incrementar la cantidad
  selectAndIncrement(tipo: string) {
    this.selectedButton = tipo;
    this.increment(tipo);
  }

  select(tipo: string) {
    this.selectedButton = tipo;
  }

  // Incrementa las entradas
  increment(tipo: string) {
    switch (tipo) {
      case 'socios':
        this.entradaSocios++;
        break;
      case 'invitados':
        this.entradaInvitados++;
        break;
      case 'consumo':
        this.entradaConsumo++;
        break;
      case 'nacional':
        this.entradaNacional++;
        break;
      case 'internacional':
        this.entradaInternacional++;
        break;
    }
    this.calcularTotal();
  }

  // Procesa entradas por consumo
  procesarEntradaXConsumo() {
    console.log(`Procesando ${this.entradaConsumo} entradas por consumo.`);
  }

  // Descontar precio (aplica el descuento)
  descontarEntrada(tipo: string) {
    if (tipo === 'nacional' && this.entradaNacional > 0) {
      this.aplicarDescuentoNacional();
    } else if (tipo === 'internacional' && this.entradaInternacional > 0) {
      this.aplicarDescuentoInternacional();
    }
  }


  async aplicarDescuentoNacional() {
    try {
      if (this.storageService.getCurrentUser().IdNivel === '001') {
        const dialogRef = this.dialog.open(DialogMCantComponent, {
          data: { title: 'Descuento Entrada Nacional' }
        });

        const result = await dialogRef.afterClosed().toPromise();

        if (!(result?.value && result.value > 0)) {
          this.descuentoNacional = 0;
          this.nuevoPrecioNacional = 0;
        } else {
          this.iIdUsuarioNacionalAdmin = this.storageService.getCurrentUser().IdUsuario;
          this.descuentoNacional = result.value;
          this.nuevoPrecioNacional = 80 - this.descuentoNacional;
        }
        this.calcularTotal();
      } else {
        await this.verificarPermisoDescuento('nacional');
      }
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    }
  }

  async aplicarDescuentoInternacional() {
    try {
      if (this.storageService.getCurrentUser().IdNivel === '001') {
        const dialogRef = this.dialog.open(DialogMCantComponent, {
          data: { title: 'Descuento Entrada Internacional' }
        });

        const result = await dialogRef.afterClosed().toPromise();

        if (!(result?.value && result.value > 0)) {
          this.descuentoInternacional = 0;
          this.nuevoPrecioInternacional = 0;
        } else {
          this.iIdUsuarioInterNacionalAdmin = this.storageService.getCurrentUser().IdUsuario;
          this.descuentoInternacional = result.value;
          this.nuevoPrecioInternacional = 130 - this.descuentoInternacional;
        }



        this.calcularTotal();
      } else {
        await this.verificarPermisoDescuento('internacional');
      }
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    }
  }

  async verificarPermisoDescuento(tipo: 'nacional' | 'internacional') {
    await Swal.fire({
      title: 'Seguridad',
      text: 'Usted no tiene permiso para aplicar descuentos.',
      icon: 'info',
      confirmButtonText: 'OK'
    });

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
        this.usuarioService.getUsuario('001', codigoAdmin).subscribe(async (response: ApiResponse<Usuario>) => {
          if (response.Success) {
            if (response.Data) {
              if (tipo === 'nacional') {
                this.iIdUsuarioNacionalAdmin = result.iRetornaUsuarioAdmin;
                await this.aplicarDescuentoNacional();
              } else {
                this.iIdUsuarioInterNacionalAdmin = result.iRetornaUsuarioAdmin;
                await this.aplicarDescuentoInternacional();
              }
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
      } else {
        if (tipo === 'nacional') {
          this.descuentoNacional = 0;
          this.nuevoPrecioNacional = 0;
        } else {
          this.descuentoInternacional = 0;
          this.nuevoPrecioInternacional = 0;
        }
      }
    });

  }


  // Restar cantidad de cualquier entrada seleccionada
  restarCantidad() {
    switch (this.selectedButton) {
      case 'socios':
        if (this.entradaSocios > 0) this.entradaSocios--;
        break;
      case 'invitados':
        if (this.entradaInvitados > 0) this.entradaInvitados--;
        break;
      case 'consumo':
        if (this.entradaConsumo > 0) this.entradaConsumo--;
        break;
      case 'nacional':
        if (this.entradaNacional > 0) this.entradaNacional--;
        break;
      case 'internacional':
        if (this.entradaInternacional > 0) this.entradaInternacional--;
        break;
    }
    this.calcularTotal();
  }

  // Limpiar todas las entradas
  limpiar() {
    this.entradaSocios = 0;
    this.entradaInvitados = 0;
    this.entradaGratis = 0;
    this.entradaConsumo = 0;
    this.entradaNacional = 0;
    this.entradaInternacional = 0;
    this.descuentoNacional = 0;
    this.descuentoInternacional = 0;
    this.selectedButton = null;
    this.nuevoPrecioInternacional=0;
    this.nuevoPrecioNacional=0;
    this.vinoConTaxista=false;
    this.calcularTotal();
  }

  TipoDocumento = EnumTipoDocumento;
  aceptar(idTipoDoc: EnumTipoDocumento) {
    try {
      // Validación de entradas
      const totalEntradas = this.entradaNacional + this.entradaInternacional;
      if (totalEntradas <= 0) {
        Swal.fire('Validación', 'No ha ingresado ninguna cantidad de Entradas.', 'warning');
        return;
      }

      if (totalEntradas < this.tragosGratis) {
        Swal.fire('Validación', 'No puede ingresar más códigos promocionales.', 'warning');
        this.tragosGratis = totalEntradas; // Ajustar los tragos gratis
        return;
      }

      if (this.tragosGratis === 0) {
        Swal.fire({
          title: 'Venta de Entradas',
          text: 'No ha ingresado un código gratuito. ¿Desea continuar con la venta?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sí',
          cancelButtonText: 'No',
        }).then((result) => {
          if (result.isDismissed) {
            return;
          }
          this.procesarVenta(idTipoDoc);
        });
      } else {
        this.procesarVenta(idTipoDoc);
      }
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    }
  }

  procesarPagoTaxista(){
    const dialogPagarTaxistaComponent = this.dialog.open(DialogPagarTaxistaComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '850px', // Establece el ancho del diálogo
      height: '700px', // Establece la altura del diálogo
    });

    dialogPagarTaxistaComponent.afterClosed().subscribe(Resultado => {

    })
    
  }

  procesarVenta(idTipoDoc: EnumTipoDocumento) {


    const pedidoCab: PedidoCab = new PedidoCab();
    const oListaPedidoDet: PedidoDet[] = [];
    pedidoCab.IdEmpleado = this.storageService.getCurrentUser().IdEmpleado;
    pedidoCab.Direccion = "";
    pedidoCab.Referencia = "";
    pedidoCab.Cliente = "";
    pedidoCab.IdPedido = 0;
    pedidoCab.NroCuenta = 1;
    pedidoCab.NroPedido = 0;
    pedidoCab.Total = this.total;
    pedidoCab.IdTipoPedido = "004";
    pedidoCab.Estado = 1;
    pedidoCab.Moneda = "SOL";
    pedidoCab.IdMesa = "9999";
    pedidoCab.IdCaja = this.turnoAbierto.IdCaja; //esto debe asignarse en el backend
    pedidoCab.NumPrecuentas = 0;
    pedidoCab.FechaPrecuenta = null;
    pedidoCab.MesaPrecuenta = null;
    pedidoCab.Observacion = '';
    pedidoCab.Dscto = this.descuentoTotal;
    pedidoCab.Importe = this.subTotal;
    pedidoCab.UsuReg = this.storageService.getCurrentSession().User.IdUsuario;
    pedidoCab.UsuMod = this.storageService.getCurrentSession().User.IdUsuario;
    pedidoCab.IdTurno = this.turnoAbierto.IdTurno;


    if (this.entradaNacional > 0) {
      const oPedidoDetNacional: PedidoDet = new PedidoDet();

      oPedidoDetNacional.IdPedido = 0;
      oPedidoDetNacional.NroCuenta = 1;
      oPedidoDetNacional.Producto = new Product({ IdProducto: 1 });
      oPedidoDetNacional.Item = 1;
      oPedidoDetNacional.Precio = 80;
      oPedidoDetNacional.Cantidad = this.entradaNacional;
      oPedidoDetNacional.Subtotal = this.entradaNacional * 80;
      oPedidoDetNacional.Enviado = true;
      oPedidoDetNacional.IdDescuento = this.nuevoPrecioNacional > 0 ? '002' : null;
      oPedidoDetNacional.UsuDescuento = this.nuevoPrecioNacional > 0 ? this.iIdUsuarioNacionalAdmin : null;
      oPedidoDetNacional.MontoDescuento = this.nuevoPrecioNacional > 0 ? 80 * this.entradaNacional - this.nuevoPrecioNacional * this.entradaNacional : 0;
      oPedidoDetNacional.NroCupon = 'ENTRADA';
      oPedidoDetNacional.Estado = 2;
      oPedidoDetNacional.Ip = this.storageService.getCurrentIP()
      oListaPedidoDet.push(oPedidoDetNacional);
    }

    if (this.entradaInternacional > 0) {
      const oPedidoDetInternacional: PedidoDet = new PedidoDet();

      oPedidoDetInternacional.IdPedido = 0;
      oPedidoDetInternacional.NroCuenta = 1;
      oPedidoDetInternacional.Producto = new Product({ IdProducto: 2 });
      oPedidoDetInternacional.Item = 2;
      oPedidoDetInternacional.Precio = 130;
      oPedidoDetInternacional.Cantidad = this.entradaInternacional;
      oPedidoDetInternacional.Subtotal = this.entradaInternacional * 130;
      oPedidoDetInternacional.Enviado = true;
      oPedidoDetInternacional.IdDescuento = this.nuevoPrecioInternacional > 0 ? '002' : null;
      oPedidoDetInternacional.UsuDescuento = this.nuevoPrecioInternacional > 0 ? this.iIdUsuarioInterNacionalAdmin : null;
      oPedidoDetInternacional.MontoDescuento = this.nuevoPrecioInternacional > 0 ? 130 * this.entradaInternacional - this.nuevoPrecioInternacional * this.entradaInternacional : 0;
      oPedidoDetInternacional.NroCupon = 'ENTRADA';
      oPedidoDetInternacional.Estado = 2;
      oPedidoDetInternacional.Ip = this.storageService.getCurrentIP()
      oListaPedidoDet.push(oPedidoDetInternacional);
    }

    pedidoCab.ListaPedidoDet = oListaPedidoDet;
    // Procesar códigos promocionales (tragos gratis)
    var listaDescuentoCodigo: DescuentoCodigo[] = [];
    for (let i = 1; i <= this.tragosGratis; i++) {
      listaDescuentoCodigo.push({
        Correlativo: 0,
        IdDescuento: '001',
        CodigoPromocional: '',
        Activo: true,
        IdPedido: 0,
        IdVenta: 0,
        UsuReg: this.storageService.getCurrentUser().IdUsuario,
        IdTaxista: this.vinoConTaxista ? '00000' : null,
      });
    }

    const dialogEmitirComprobanteComponent = this.dialog.open(DialogEmitirComprobanteComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '705px', // Establece el ancho del diálogo
      height: '915px', // Establece la altura del diálogo
      data: {
        lblcambio: this.turnoAbierto.TipoCambioVenta,
        dblImporte: this.subTotal,
        dblDscto: this.descuentoTotal,
        dblTotal: this.total,
        dblGranTotal: this.total,
        idPedidoCobrar: 0,
        nroCuentaCobrar: 0,
        idTipoPedido: '004',
        idTipoDoc: idTipoDoc,
        pedidoCab: pedidoCab,
        listaDescuentoCodigo: listaDescuentoCodigo,
        bTurnoIndenpendiente: false,
        idCaja: this.turnoAbierto.IdCaja,
        idTurno: this.turnoAbierto.IdTurno
      }
    });

    dialogEmitirComprobanteComponent.afterClosed().subscribe(resultado => {
      if (resultado.estado === 'Cobrado'){
        const listaImpresionDTO: ImpresionDTO[] =  resultado.listaImpresionDTO; 
        this.procesarEntrada(listaImpresionDTO[0].IdVenta);
        // Reiniciar campos
        this.limpiar();
      }
    })
    
  }

  salir() {
    this.dialogRef.close();
  }
  // Simulación del modal para clave de administrador
  async openClaveAnulaModal() {
    // Simulación: Aquí va la lógica para abrir el modal y esperar la respuesta.
    return new Promise(resolve => {
      resolve({ sRetornaRespuesta: 'Enter', iRetornaUsuarioAdmin: 12345 });
    });
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


  calcularTotal() {
    let dSubTotalNacional = 0, dSubTotalInternacional = 0;
    let dDescuentoNacional = 0, dDescuentoInternacional = 0;
    let dTotalNacional = 0, dTotalInternacional = 0;

    // Cálculo para Nacional
    if (this.descuentoNacional === 0) {
      dSubTotalNacional = 80 * this.entradaNacional;
      dDescuentoNacional = 0;
      dTotalNacional = dSubTotalNacional;
    } else {
      dSubTotalNacional = 80 * this.entradaNacional;
      dDescuentoNacional = dSubTotalNacional - (this.nuevoPrecioNacional * this.entradaNacional);
      dTotalNacional = dSubTotalNacional - dDescuentoNacional;
    }

    // Cálculo para Internacional
    if (this.descuentoInternacional === 0) {
      dSubTotalInternacional = 130 * this.entradaInternacional;
      dDescuentoInternacional = 0;
      dTotalInternacional = dSubTotalInternacional;
    } else {
      dSubTotalInternacional = 130 * this.entradaInternacional;
      dDescuentoInternacional = dSubTotalInternacional - (this.nuevoPrecioInternacional * this.entradaInternacional);
      dTotalInternacional = dSubTotalInternacional - dDescuentoInternacional;
    }

    // Actualizar Tragos Gratis, Subtotal, Descuento y Total
    this.tragosGratis = this.entradaNacional + this.entradaInternacional;
    this.subTotal = dSubTotalNacional + dSubTotalInternacional;
    this.descuentoTotal = dDescuentoNacional + dDescuentoInternacional;
    this.total = dTotalNacional + dTotalInternacional;
  }

  // Función para imprimir las entradas (simulada)
  ImprimirEntrada(correlativo: number) {
    console.log(`Imprimiendo entrada con correlativo: ${correlativo}`);
  }

  async procesarEntrada(idVenta: number) {
    try {
      this.spinnerService.show();
      const entradaNacional = this.entradaNacional;
      const entradaInternacional = this.entradaInternacional;

      if (entradaNacional === 0 && entradaInternacional === 0) {
        return;
      }
  
      // Variables para almacenar todas las entradas
      let impresiones: ImpresionDTO[] = [];
      // Procesar entrada nacional si existe
      if (entradaNacional > 0) {
        let responseNacional: ApiResponse<ImpresionDTO[]> = await this.entradasemitidasService.procesarEmisionEntradas(entradaNacional, 'NACIONAL', this.storageService.getCurrentUser().IdUsuario, idVenta).toPromise();
        impresiones = impresiones.concat(responseNacional.Data); // Agregar los resultados nacionales
        console.log('nacional ' + impresiones);
      }

      // Procesar entrada internacional si existe
      if (entradaInternacional > 0) {
        let responseInternacional: ApiResponse<ImpresionDTO[]> = await this.entradasemitidasService.procesarEmisionEntradas(entradaInternacional, 'INTERNACIONAL', this.storageService.getCurrentUser().IdUsuario, idVenta).toPromise();
        impresiones = impresiones.concat(responseInternacional.Data); // Agregar los resultados internacionales
        console.log('Internacional ' + impresiones);
      }

      if (impresiones.length > 0) {
        this.imprimir(impresiones);
      }
  
      this.spinnerService.hide();
  
    } catch (error) {
      this.spinnerService.hide();
      await Swal.fire({
        title: 'Error',
        text: error.message,
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  }
  

  async procesarEntradaGratis() {
    try {

      if (this.entradaSocios === 0 && this.entradaInvitados === 0) {
        return;
      }

      if (this.storageService.getCurrentUser().IdNivel === '001') {
        const confirmResult = await Swal.fire({
          title: 'Está apunto de procesar:',
          html: `
                    ${(this.entradaSocios !== 0 ? this.entradaSocios + " Entrada(s) para Socios<br>" : "")}
                    ${(this.entradaSocios !== 0 ? this.entradaSocios + " Entrada(s) para Invitados<br>" : "")}
                    ¿Desea Continuar?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sí',
          cancelButtonText: 'No'
        });

        if (confirmResult.isDismissed) return;


        var responseService: ApiResponse<ImpresionDTO[]> = await this.entradasemitidasService.procesarEmisionEntradas(this.entradaSocios, 'SOCIOS', this.storageService.getCurrentUser().IdUsuario, null).toPromise();
        this.imprimir(responseService.Data);

        var responseService: ApiResponse<ImpresionDTO[]> = await this.entradasemitidasService.procesarEmisionEntradas(this.entradaInvitados, 'INVITADOS', this.storageService.getCurrentUser().IdUsuario, null).toPromise();
        this.imprimir(responseService.Data);
      } else {
        await Swal.fire({
          title: 'Seguridad',
          text: 'Usted no tiene permiso para procesar entradas gratis.',
          icon: 'info',
          confirmButtonText: 'OK'
        });

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
            this.usuarioService.getUsuario('001', codigoAdmin).subscribe(async (response: ApiResponse<Usuario>) => {
              if (response.Success) {
                if (response.Data) {
                  const confirmResult = await Swal.fire({
                    title: 'Está apunto de procesar:',
                    html: `
                            ${(this.entradaSocios !== 0 ? this.entradaSocios + " Entrada(s) para Socios<br>" : "")}
                            ${(this.entradaSocios !== 0 ? this.entradaSocios + " Entrada(s) para Invitados<br>" : "")}
                            ¿Desea Continuar?`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Sí',
                    cancelButtonText: 'No'
                  });

                  if (confirmResult.isDismissed) return;

                  var responseService: ApiResponse<ImpresionDTO[]> = await this.entradasemitidasService.procesarEmisionEntradas(this.entradaSocios, 'SOCIOS', this.storageService.getCurrentUser().IdUsuario, null).toPromise();
                  this.imprimir(responseService.Data);

                  var responseService: ApiResponse<ImpresionDTO[]> = await this.entradasemitidasService.procesarEmisionEntradas(this.entradaInvitados, 'INVITADOS', this.storageService.getCurrentUser().IdUsuario, null).toPromise();
                  this.imprimir(responseService.Data);
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

      this.limpiar();
    } catch (error) {
      await Swal.fire({
        title: 'Error',
        text: error.message,
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  }
}