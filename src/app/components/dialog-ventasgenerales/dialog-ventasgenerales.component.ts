import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { NgxSpinnerService } from 'ngx-spinner';
import { firstValueFrom } from 'rxjs';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { CARACTERISTICAS_LICENCIA } from 'src/app/constants/caracteristicas-licencia';
import { NivelUsuarioEnum } from 'src/app/enums/enum';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import { TipoCorreccionVenta } from 'src/app/interfaces/correccion-venta.interface';
import { ImpresionDTO } from 'src/app/interfaces/impresionDTO.interface';
import { VentasInterface } from 'src/app/interfaces/ventas.interface';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { LicenciaTenantService } from 'src/app/services/licencia-tenant.service';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';
import { ReprintFormatService } from 'src/app/services/reprint-format.service';
import { StorageService } from 'src/app/services/storage.service';
import { VentaService } from 'src/app/services/venta.service';
import { Notificar } from 'src/app/shared/notificaciones';
import { DialogCorregirVentaComponent } from '../dialog-corregir-venta/dialog-corregir-venta.component';
import { DialogEmitirVentaComponent } from '../dialog-emitir-venta/dialog-emitir-venta.component';

@Component({
  selector: 'app-dialog-ventasgenerales',
  templateUrl: './dialog-ventasgenerales.component.html',
  styleUrls: ['./dialog-ventasgenerales.component.css'],
})
export class DialogVentasgeneralesComponent implements OnInit {
  readonly tipoCorreccionPagos = TipoCorreccionVenta.Pagos;
  readonly tipoCorreccionCliente = TipoCorreccionVenta.Cliente;

  @ViewChild(MatPaginator)
  set matPaginator(paginator: MatPaginator | undefined) {
    this.paginator = paginator;
    this.dataSource.paginator = paginator ?? null;
  }

  private paginator?: MatPaginator;
  ventas: VentasInterface[] = [];
  dataSource = new MatTableDataSource<VentasInterface>([]);
  displayedColumns = [
    'Documento',
    'FechaVenta',
    'Caja',
    'Cliente',
    'TipoDocumento',
    'Total',
    'EstadoDescripcion',
    'EstadoFiscalDescripcion',
    'acciones',
  ];

  ventaSeleccionada: VentasInterface | null = null;
  fechaDesde = this.fechaLocalActual();
  fechaHasta = this.fechaLocalActual();
  incluirVentasExpress = false;
  textoFiltro = '';
  estadoSeleccionado = 0;
  tipoDocumentoSeleccionado = '';
  cajaSeleccionada = '';
  procesando = true;
  procesandoAccion = false;
  comprobantesHabilitados = false;
  correccionHabilitada = false;
  cuotaComprobantesAgotada = false;

  constructor(
    public dialogRef: MatDialogRef<DialogVentasgeneralesComponent>,
    private readonly ventaService: VentaService,
    private readonly spinnerService: NgxSpinnerService,
    private readonly dialog: MatDialog,
    private readonly texts: TenantTextCatalogService,
    private readonly licenciaTenantService: LicenciaTenantService,
    private readonly configuracionService: ConfiguracionService,
    private readonly reprintFormat: ReprintFormatService,
    private readonly storageService: StorageService,
  ) {}

  ngOnInit(): void {
    this.licenciaTenantService.obtenerEstado().subscribe(estado => {
      this.comprobantesHabilitados = this.licenciaTenantService.evaluar(
        estado,
        CARACTERISTICAS_LICENCIA.OperacionComprobantes,
      );
      if (this.comprobantesHabilitados) this.cargarCuotaComprobantes();
      this.correccionHabilitada = this.licenciaTenantService.evaluar(
        estado,
        [
          CARACTERISTICAS_LICENCIA.OperacionComprobantes,
          CARACTERISTICAS_LICENCIA.VentasCorreccionDocumentos,
        ],
      );
    });
    this.loadVentas();
  }

  get tiposDocumento(): string[] {
    return [...new Set(this.ventas.map(venta => venta.TipoDocumento).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
  }

  get cajas(): string[] {
    return [...new Set(this.ventas.map(venta => venta.Caja).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
  }

  get totalGenerados(): number {
    return this.dataSource.data.filter(venta => venta.Estado === 1).length;
  }

  get totalNoVigentes(): number {
    return this.dataSource.data.filter(venta => venta.Estado !== 1).length;
  }

  get totalAtencionFiscal(): number {
    return this.dataSource.data.filter(venta =>
      venta.EstadoFiscal === 2 || venta.EstadoFiscal === 7).length;
  }

  loadVentas(): void {
    if (!this.fechasValidas()) {
      void Swal.fire(
        this.texts.get('validation'),
        this.texts.get('invalidSalesDateRange'),
        'warning',
      );
      return;
    }

    this.procesando = true;
    this.ventaSeleccionada = null;
    this.ventaService.getListadoVentas(
      this.fechaDesde,
      this.fechaHasta,
      this.incluirVentasExpress,
      this.estadoSeleccionado || undefined,
    ).pipe(finalize(() => (this.procesando = false)))
      .subscribe({
        next: data => {
          this.ventas = data ?? [];
          this.ajustarFiltrosDisponibles();
          this.aplicarFiltro();
        },
        error: () => {
          this.ventas = [];
          this.aplicarFiltro();
        },
      });
  }

  aplicarFiltro(): void {
    const texto = this.normalizar(this.textoFiltro);
    this.dataSource.data = this.ventas.filter(venta => {
      const coincideTexto = !texto || [
        venta.Documento,
        venta.Cliente,
        venta.NumeroIdentificacion,
        venta.Caja,
        venta.TipoDocumento,
        venta.EstadoDescripcion,
        venta.EstadoFiscalDescripcion,
      ].some(valor => this.normalizar(valor).includes(texto));
      const coincideTipo = !this.tipoDocumentoSeleccionado
        || venta.TipoDocumento === this.tipoDocumentoSeleccionado;
      const coincideCaja = !this.cajaSeleccionada
        || venta.Caja === this.cajaSeleccionada;
      return coincideTexto && coincideTipo && coincideCaja;
    });

    this.dataSource.paginator = this.paginator ?? null;
    this.paginator?.firstPage();
  }

  limpiarBusqueda(): void {
    this.textoFiltro = '';
    this.aplicarFiltro();
  }

  limpiarFiltros(): void {
    const hoy = this.fechaLocalActual();
    this.fechaDesde = hoy;
    this.fechaHasta = hoy;
    this.estadoSeleccionado = 0;
    this.tipoDocumentoSeleccionado = '';
    this.cajaSeleccionada = '';
    this.incluirVentasExpress = false;
    this.textoFiltro = '';
    this.loadVentas();
  }

  trackVenta(_: number, venta: VentasInterface): number {
    return venta.IdVenta;
  }

  seleccionarVenta(row: VentasInterface): void {
    this.ventaSeleccionada = row;
  }

  onNoClick(): void {
    if (!this.procesando && !this.procesandoAccion) this.dialogRef.close();
  }

  esDocumentoActivo(venta: VentasInterface | null): boolean {
    return venta?.Estado === 1;
  }

  tieneCorreoValido(venta: VentasInterface | null): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(venta?.ClienteCorreo?.trim() ?? '');
  }

  claseEstado(venta: VentasInterface): string {
    return venta.Estado === 1 ? 'success' : 'danger';
  }

  claseEstadoFiscal(venta: VentasInterface): string {
    if (venta.EstadoFiscal === 3 || venta.EstadoFiscal === 4) return 'success';
    if (venta.EstadoFiscal === 2 || venta.EstadoFiscal === 7) return 'danger';
    if (venta.EstadoFiscal === 1 || venta.EstadoFiscal === 5) return 'info';
    return 'neutral';
  }

  OpenDialogEmitirVenta(): void {
    if (!this.comprobantesHabilitados || this.cuotaComprobantesAgotada) {
      void Swal.fire(
        this.texts.get('attention'),
        this.cuotaComprobantesAgotada
          ? 'La licencia alcanzó el máximo mensual de comprobantes.'
          : 'La licencia actual no incluye la emisión de comprobantes.',
        'warning',
      );
      return;
    }

    const dialogRef = this.dialog.open(DialogEmitirVentaComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px',
      maxWidth: '95vw',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.cargarCuotaComprobantes();
      this.loadVentas();
    });
  }

  corregirVenta(tipoCorreccion: TipoCorreccionVenta): void {
    const venta = this.ventaSeleccionada;
    if (!venta || !this.esDocumentoActivo(venta)) return;
    if (!this.esAdministrador()) {
      void Swal.fire(
        this.texts.get('attention'),
        this.texts.get('noPermissionEnterAdminKey'),
        'error',
      );
      return;
    }

    const dialogRef = this.dialog.open(DialogCorregirVentaComponent, {
      width: '92vw',
      maxWidth: '1120px',
      data: {
        idVenta: venta.IdVenta,
        tipoCorreccionInicial: tipoCorreccion,
      },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result?.actualizado) this.loadVentas();
    });
  }

  async descargarArchivo(formato: 'pdf' | 'xml'): Promise<void> {
    const venta = this.ventaSeleccionada;
    if (!venta) return;
    this.procesandoAccion = true;
    this.spinnerService.show();
    try {
      const blob = await firstValueFrom(
        this.ventaService.descargarArchivoComprobante(venta.IdVenta, formato),
      );
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `${venta.Documento}.${formato}`;
      enlace.click();
      URL.revokeObjectURL(url);
    } finally {
      this.procesandoAccion = false;
      this.spinnerService.hide();
    }
  }

  async enviarPorCorreo(): Promise<void> {
    const venta = this.ventaSeleccionada;
    if (!venta) return;
    if (!this.tieneCorreoValido(venta)) {
      await Swal.fire(
        this.texts.get('validation'),
        this.texts.get('customerWithoutValidEmail'),
        'warning',
      );
      return;
    }

    const confirmacion = await Swal.fire({
      title: this.texts.get('sendReceiptByEmail'),
      text: this.texts.get('confirmReceiptEmail', {
        email: venta.ClienteCorreo ?? '',
      }),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.texts.get('send'),
      cancelButtonText: this.texts.get('cancel'),
    });
    if (!confirmacion.isConfirmed) return;

    this.procesandoAccion = true;
    this.spinnerService.show();
    try {
      const response = await firstValueFrom(
        this.ventaService.enviarComprobantePorCorreo(venta.IdVenta),
      );
      await Swal.fire(
        this.texts.get('sent'),
        this.texts.get('receiptEmailSent', { email: response.Data.Correo }),
        'success',
      );
    } finally {
      this.procesandoAccion = false;
      this.spinnerService.hide();
    }
  }

  async reImprimirDocumento(): Promise<void> {
    const venta = this.ventaSeleccionada;
    if (!venta) return;
    const formato = await this.reprintFormat.choose();
    if (formato === null) return;

    this.procesandoAccion = true;
    this.spinnerService.show();
    try {
      const response: ApiResponse<ImpresionDTO[]> = await firstValueFrom(
        this.ventaService.getImpresionComprobanteVenta(venta.IdVenta, formato),
      );
      if (!response.Success) throw new Error(response.Message);
      for (const documento of response.Data) {
        await this.ventaService.showPDF(documento.Documento);
      }
    } catch (error) {
      await Swal.fire(this.texts.get('error'), String(error), 'error');
    } finally {
      this.procesandoAccion = false;
      this.spinnerService.hide();
    }
  }

  async anularDocumento(): Promise<void> {
    const venta = this.ventaSeleccionada;
    if (!venta || !this.esDocumentoActivo(venta)) return;
    if (!this.esAdministrador()) {
      void Notificar.advertencia(
        this.texts.get('void'),
        this.texts.get('onlyAdminCanVoidDocuments'),
      );
      return;
    }

    const motivo = await Swal.fire({
      title: this.texts.get('confirmVoidDocument', { document: venta.Documento }),
      text: this.texts.get('actionCannotBeUndone'),
      input: 'textarea',
      inputLabel: this.texts.get('voidReason'),
      inputPlaceholder: this.texts.get('voidReasonPlaceholder'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.texts.get('yesVoid'),
      cancelButtonText: this.texts.get('noCancel'),
      inputValidator: value => value.trim().length >= 3
        ? undefined
        : this.texts.get('enterVoidReasonMsg'),
    });
    if (!motivo.isConfirmed) return;

    const documentoOtorgado = await this.solicitarEstadoEntregaDocumento();
    if (documentoOtorgado === undefined) return;

    this.procesandoAccion = true;
    this.spinnerService.show();
    try {
      const response = await firstValueFrom(
        this.ventaService.anularDocumentoVenta(venta.IdVenta, {
          Motivo: String(motivo.value).trim(),
          AnularPedido: true,
          DocumentoOtorgado: documentoOtorgado,
        }),
      );
      await Notificar.exito(
        this.texts.get('voided'),
        response.Data?.Mensaje || this.texts.get('documentVoidedSuccessfully'),
      );
      this.loadVentas();
    } finally {
      this.procesandoAccion = false;
      this.spinnerService.hide();
    }
  }

  private cargarCuotaComprobantes(): void {
    this.licenciaTenantService.obtenerCuotaComprobantes().subscribe({
      next: cuota => (this.cuotaComprobantesAgotada = cuota.Agotada),
      error: () => (this.cuotaComprobantesAgotada = false),
    });
  }

  private async solicitarEstadoEntregaDocumento(): Promise<boolean | null | undefined> {
    let paisISO2 = this.configuracionService.snapshot?.PaisISO2?.toUpperCase();
    if (!paisISO2) {
      try {
        paisISO2 = (await firstValueFrom(this.configuracionService.get()))
          ?.PaisISO2?.toUpperCase();
      } catch {
        await Swal.fire(
          this.texts.get('error'),
          this.texts.get('couldNotDetermineFiscalCountry'),
          'error',
        );
        return undefined;
      }
    }

    if (paisISO2 !== 'PE') return null;
    const result = await Swal.fire({
      title: this.texts.get('documentDeliveredQuestion'),
      text: this.texts.get('documentDeliveredExplanation'),
      icon: 'question',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: this.texts.get('documentDeliveredYes'),
      denyButtonText: this.texts.get('documentDeliveredNo'),
      cancelButtonText: this.texts.get('cancel'),
      allowOutsideClick: false,
    });
    return result.isDismissed ? undefined : result.isConfirmed;
  }

  private fechasValidas(): boolean {
    return !!this.fechaDesde && !!this.fechaHasta
      && this.fechaDesde <= this.fechaHasta;
  }

  private ajustarFiltrosDisponibles(): void {
    if (this.tipoDocumentoSeleccionado
        && !this.tiposDocumento.includes(this.tipoDocumentoSeleccionado)) {
      this.tipoDocumentoSeleccionado = '';
    }
    if (this.cajaSeleccionada && !this.cajas.includes(this.cajaSeleccionada)) {
      this.cajaSeleccionada = '';
    }
  }

  private esAdministrador(): boolean {
    return this.storageService.getCurrentUser().IdNivel
      === NivelUsuarioEnum.Administrador;
  }

  private normalizar(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase()
      .trim();
  }

  private fechaLocalActual(): string {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
