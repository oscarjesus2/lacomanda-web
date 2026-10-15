import { formatDate } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom, forkJoin, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  InformeContableInterface as InformeContableVentaInterface,
  InformeContablePago,
} from 'src/app/interfaces/ventas.interface';
import { InformeContableCompra } from 'src/app/interfaces/compras.interface';
import { ReporteContableImpuesto } from 'src/app/interfaces/reporte-contable-impuesto.interface';
import { CajaTipoDocumento } from 'src/app/models/caja-tipo-documento.model';
import { Moneda } from 'src/app/models/moneda.models';
import { Tarjeta } from 'src/app/models/tarjeta.models';
import { CajaService } from 'src/app/services/caja.service';
import { CompraService } from 'src/app/services/compra.service';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { EntradaCompraService } from 'src/app/services/entrada-compra.service';
import { TipoDocumentoPaisService } from 'src/app/services/tipo-documento-pais.service';
import { MonedaService } from 'src/app/services/moneda.service';
import { TarjetaService } from 'src/app/services/tarjeta.service';
import { VentaService } from 'src/app/services/venta.service';
import { TenantRegionalNumberFormatterService } from 'src/app/services/localization/tenant-regional-number-formatter.service';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

interface OpcionDocumento { id: string; descripcion: string; }
type MonedaCobro = Pick<Moneda, 'IdMoneda' | 'Descripcion'>;

@Component({
  selector: 'app-dialog-reportecontable',
  templateUrl: './dialog-reportecontable.component.html',
  styleUrls: ['./dialog-reportecontable.component.css']
})
export class DialogReportecontableComponent {
  tipoInformeSeleccionado = 'Ventas';
  tiposDocumento: OpcionDocumento[] = [];
  series: string[] = [];
  tarjetas: Tarjeta[] = [];
  monedasCobro: MonedaCobro[] = [];
  private documentosCajas: CajaTipoDocumento[] = [];
  serieSeleccionada = '0';
  tipoDocumentoSeleccionado = '0';
  fechaInicial: string;
  fechaFinal: string;
  paisISO2 = '';
  cargandoFiltros = false;
  errorFiltros = '';
  exportando = false;

  constructor(
    public dialogRef: MatDialogRef<DialogReportecontableComponent>,
    private cajaService: CajaService,
    private configuracionService: ConfiguracionService,
    private entradaCompraService: EntradaCompraService,
    private tipoDocumentoPaisService: TipoDocumentoPaisService,
    private tarjetaService: TarjetaService,
    private monedaService: MonedaService,
    private ventaService: VentaService,
    private compraService: CompraService,
    private regionalNumberFormatter: TenantRegionalNumberFormatterService,
  ) { }

  ngOnInit(): void {
    const hoy = formatDate(new Date(), 'yyyy-MM-dd', 'en-US');
    this.fechaInicial = hoy;
    this.fechaFinal = hoy;
    void this.cargarFiltros();
  }

  onNoClick(): void { this.dialogRef.close(); }

  get mostrarSerie(): boolean { return this.tipoInformeSeleccionado === 'Ventas'; }
  get rangoValido(): boolean {
    return !!this.fechaInicial && !!this.fechaFinal && this.fechaInicial <= this.fechaFinal;
  }

  get seriesDisponibles(): string[] {
    if (this.tipoDocumentoSeleccionado === '0') return this.series;
    return Array.from(new Set(this.documentosCajas
      .filter(doc => String(doc.IdTipoDocumento) === this.tipoDocumentoSeleccionado)
      .map(doc => doc.Serie?.trim())
      .filter((serie): serie is string => !!serie)))
      .sort((a, b) => a.localeCompare(b));
  }

  onTipoDocumentoChange(): void {
    if (!this.seriesDisponibles.includes(this.serieSeleccionada)) this.serieSeleccionada = '0';
  }

  onTipoInformeChange(): void {
    this.tipoDocumentoSeleccionado = '0';
    this.serieSeleccionada = '0';
    void this.cargarFiltros();
  }

  async cargarFiltros(): Promise<void> {
    const tipoInforme = this.tipoInformeSeleccionado;
    this.cargandoFiltros = true;
    this.errorFiltros = '';
    this.tiposDocumento = [];
    this.series = [];
    this.tarjetas = [];
    this.monedasCobro = [];
    try {
      const config = this.configuracionService.snapshot
        ?? await firstValueFrom(this.configuracionService.get());
      this.paisISO2 = (config?.PaisISO2 ?? '').toUpperCase();
      if (!this.paisISO2) throw new Error('El país del establecimiento no está configurado.');

      if (tipoInforme === 'Compras') {
        const response = await firstValueFrom(this.entradaCompraService.catalogos());
        if (!response.Success || !response.Data) throw new Error('No se pudieron cargar los tipos de compras.');
        if (tipoInforme !== this.tipoInformeSeleccionado) return;
        this.tiposDocumento = response.Data.TiposDocumento.map(doc => ({
          id: doc.Id,
          descripcion: doc.Descripcion,
        }));
        return;
      }

      const [cajasResponse, tiposPais, tarjetas, monedasResponse] = await firstValueFrom(forkJoin([
        this.cajaService.getAllCaja(true),
        this.tipoDocumentoPaisService.GetTiposDocumentos(),
        this.tarjetaService.getTarjeta(),
        this.monedaService.getMoneda(),
      ]));
      const cajas = cajasResponse.Data ?? [];
      const documentosPorCaja = cajas.length
        ? await firstValueFrom(forkJoin(cajas.map(caja =>
          this.cajaService.getTipoDocumentoByCaja(caja.IdCaja))))
        : [];
      if (tipoInforme !== this.tipoInformeSeleccionado) return;
      if (!monedasResponse.Success) {
        throw new Error('No se pudieron cargar las monedas para el reporte.');
      }
      this.tarjetas = (tarjetas ?? []).slice().sort((a, b) =>
        (a.Orden ?? Number.MAX_VALUE) - (b.Orden ?? Number.MAX_VALUE)
        || a.Descripcion.localeCompare(b.Descripcion));
      this.monedasCobro = (monedasResponse.Data ?? []).slice().sort((a, b) =>
        (a.IdMoneda === config?.IdMoneda ? -1 : b.IdMoneda === config?.IdMoneda ? 1 : 0)
        || a.Descripcion.localeCompare(b.Descripcion));
      const idsPermitidos = new Set(tiposPais
        .filter(tipo => tipo.EsFiscal ?? (tipo.IdTipoDocumento !== 9))
        .map(tipo => tipo.IdTipoDocumento));
      // Un informe histórico también necesita series desactivadas hoy.
      this.documentosCajas = documentosPorCaja.flat().filter(doc =>
        idsPermitidos.has(doc.IdTipoDocumento));
      const tipos = new Map<string, string>();
      this.documentosCajas.forEach(doc => {
        tipos.set(String(doc.IdTipoDocumento), doc.Descripcion);
      });
      this.tiposDocumento = Array.from(tipos, ([id, descripcion]) => ({ id, descripcion }))
        .sort((a, b) => a.descripcion.localeCompare(b.descripcion));
      this.series = Array.from(new Set(this.documentosCajas
        .map(doc => doc.Serie?.trim())
        .filter((serie): serie is string => !!serie)))
        .sort((a, b) => a.localeCompare(b));
    } catch (error) {
      if (tipoInforme === this.tipoInformeSeleccionado) {
        this.errorFiltros = error instanceof Error ? error.message : 'No se pudieron cargar los filtros.';
      }
    } finally {
      if (tipoInforme === this.tipoInformeSeleccionado) this.cargandoFiltros = false;
    }
  }

  validarFormularioExport(): void {
    if (!this.rangoValido) {
      Swal.fire('Validación', 'Seleccione un rango de fechas válido.', 'warning');
      return;
    }
    if (this.cargandoFiltros || this.errorFiltros || this.exportando) return;

    this.exportando = true;
    const inicio = formatDate(this.fechaInicial, 'yyyyMMdd', 'en-US');
    const fin = formatDate(this.fechaFinal, 'yyyyMMdd', 'en-US');
    const reporte: Observable<InformeContableVentaInterface[] | InformeContableCompra[]> = this.mostrarSerie
      ? this.ventaService.getInformeContable(inicio, fin, this.serieSeleccionada, this.tipoDocumentoSeleccionado)
      : this.compraService.getInformeContable(inicio, fin, this.tipoDocumentoSeleccionado);
    reporte.pipe(finalize(() => this.exportando = false)).subscribe({
      next: datos => {
        if (!datos.length) {
          Swal.fire('Sin registros', 'No se encontraron registros para exportar.', 'warning');
          return;
        }
        const filas = this.mostrarSerie
          ? this.filasVentas(datos as InformeContableVentaInterface[])
          : this.filasCompras(datos as InformeContableCompra[]);
        const descargar = () => {
          const hoja = XLSX.utils.json_to_sheet(filas);
          const libro = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(libro, hoja, 'InformeContable');
          XLSX.writeFile(libro, `InformeContable_${this.tipoInformeSeleccionado}_${this.paisISO2}_${inicio}_${fin}.xlsx`);
        };
        const descuadrados = (datos as Array<InformeContableVentaInterface | InformeContableCompra>).filter(d =>
          Math.abs(d.DiferenciaDesglose ?? 0) > 0.01).length;
        if (descuadrados > 0) {
          void Swal.fire({
            icon: 'warning',
            title: 'Hay importes por revisar',
            text: `${descuadrados} comprobante(s) no cuadran con su desglose. El Excel los marcará como REVISAR.`,
            showCancelButton: true,
            confirmButtonText: 'Exportar con advertencias',
            cancelButtonText: 'Cancelar',
          }).then(resultado => {
            if (resultado.isConfirmed) descargar();
          });
          return;
        }
        descargar();
      },
      error: () => Swal.fire('Error', 'No se pudo generar el informe contable.', 'error'),
    });
  }

  private filasVentas(datos: InformeContableVentaInterface[]): object[] {
    const tasas = this.tasasDelInforme(datos);
    const impuestosAdicionales = this.paisISO2 === 'PE'
      ? this.impuestosConImporte(datos, [{
        nombre: 'ICBPER',
        obtenerImporte: venta => venta.ICBPER,
      }])
      : [];
    if (this.paisISO2 !== 'ES') return datos.map(v => {
      const {
        DesgloseImpuestos,
        Pagos,
        IdMoneda,
        IGV,
        ICBPER,
        DirecEmpresa,
        ...fila
      } = v;
      const filaContable = {
        ...this.insertarImpuestosDespuesDeBase(
          fila,
          'ValorVenta',
          {
            ...this.columnasImpuestosPorTasa(DesgloseImpuestos, tasas, 'IGV'),
            ...this.columnasImpuestosOpcionales(v, impuestosAdicionales),
          },
        ),
        'Cuadre tributario': this.estadoCuadre(v.DiferenciaDesglose),
        DirecEmpresa,
      };
      return this.formatearFilaContable({
        ...filaContable,
        ...this.columnasPagos(Pagos, IdMoneda ?? ''),
      });
    });
    return datos.map(v => this.formatearFilaContable({
      Fecha: v.Fecha,
      Serie: v.Serie,
      'Tipo de documento': v.TipoDocumento,
      Número: v.Documento,
      'NIF del cliente': v.Ruc,
      Cliente: v.Cliente,
      Moneda: v.Moneda,
      'Base imponible': v.ValorVenta,
      ...this.columnasImpuestosPorTasa(v.DesgloseImpuestos, tasas, 'IVA'),
      'Base sin IVA': v.OpInafecto,
      Servicio: v.Servicio,
      'Total contable': v.Total,
      'Total del documento': v.TotalDocumento,
      'Diferencia con documento': v.DiferenciaDesglose,
      'Cuadre tributario': this.estadoCuadre(v.DiferenciaDesglose),
      'Estado del documento': v.EstadoDescripcion,
      'Documento de referencia': v.DocRef,
      'Fecha de referencia': v.FechaRef,
      Empresa: v.Empresa,
      'NIF de la empresa': v.RucEmpresa,
      DirecEmpresa: v.DirecEmpresa,
      ...this.columnasPagos(v.Pagos, v.IdMoneda ?? ''),
    }));
  }

  private filasCompras(datos: InformeContableCompra[]): object[] {
    const tasas = this.tasasDelInforme(datos);
    const impuestosAdicionales = this.impuestosConImporte(datos, [
      {
        nombre: 'Otros impuestos',
        obtenerImporte: compra => compra.Otros,
      },
      {
        nombre: 'ISC',
        obtenerImporte: compra => compra.ISC,
      },
    ]);
    if (this.paisISO2 !== 'ES') return datos.map(c => {
      const {
        DesgloseImpuestos,
        IGV,
        PorcentajeIGV,
        Otros,
        ISC,
        ...fila
      } = c;
      return this.formatearFilaContable({
        ...this.insertarImpuestosDespuesDeBase(
          fila,
          'Afecto',
          {
            ...this.columnasImpuestosPorTasa(DesgloseImpuestos, tasas, 'IGV'),
            ...this.columnasImpuestosOpcionales(c, impuestosAdicionales),
          },
        ),
        Cuadre: this.estadoCuadre(c.DiferenciaDesglose),
      });
    });
    return datos.map(c => this.formatearFilaContable({
      'Fecha de emisión': c.FechaEmision,
      'Fecha de recepción': c.FechaRecepcion,
      'Tipo de documento': this.tiposDocumento.find(tipo =>
        tipo.id === c.IdTipoDocumento)?.descripcion ?? c.TipoDoc,
      Serie: c.SerieDocm,
      Número: c.NoDocm,
      'NIF del proveedor': c.RucCodigoCliente,
      Proveedor: c.RazonSocial,
      'Base imponible': c.Afecto,
      ...this.columnasImpuestosPorTasa(c.DesgloseImpuestos, tasas, 'IVA'),
      ...this.columnasImpuestosOpcionales(c, impuestosAdicionales),
      'Base sin IVA': c.Inafecto,
      Total: c.Total,
      'Estado del documento': c.EstadoDocumento,
      'Diferencia con documento': c.DiferenciaDesglose,
      Cuadre: this.estadoCuadre(c.DiferenciaDesglose),
      Moneda: c.Moneda,
      'Tipo de cambio': c.Cambio,
      'Fecha de pago': c.FechaPago,
      Referencia: c.Referencia,
    }));
  }

  private tasasDelInforme(datos: Array<{ DesgloseImpuestos: ReporteContableImpuesto[] }>): Array<number | null> {
    return Array.from(new Set(datos.flatMap(d =>
      (d.DesgloseImpuestos ?? [])
        .filter(i => this.tieneImporte(i.Cuota))
        .map(i => i.Tasa))))
      .sort((a, b) => (a ?? Number.MAX_VALUE) - (b ?? Number.MAX_VALUE));
  }

  /**
   * La base ya está representada por ValorVenta/Base imponible. Se expone
   * únicamente el importe de cada impuesto, una vez por tasa real.
   */
  private columnasImpuestosPorTasa(
    desglose: ReporteContableImpuesto[],
    tasas: Array<number | null>,
    nombreImpuesto: string,
  ): Record<string, number> {
    const columnas: Record<string, number> = {};
    for (const tasa of tasas) {
      const etiqueta = tasa === null
        ? 'sin tasa registrada'
        : `${this.regionalNumberFormatter.formatNumber(tasa, this.paisISO2)}%`;
      const detalle = (desglose ?? []).find(item => item.Tasa === tasa);
      columnas[`${nombreImpuesto} ${etiqueta}`] = detalle?.Cuota ?? 0;
    }
    return columnas;
  }

  private insertarImpuestosDespuesDeBase(
    fila: Record<string, unknown>,
    campoBase: string,
    impuestos: Record<string, number>,
  ): Record<string, unknown> {
    const resultado: Record<string, unknown> = {};
    for (const [columna, valor] of Object.entries(fila)) {
      resultado[columna] = valor;
      if (columna === campoBase) {
        Object.assign(
          resultado,
          impuestos,
        );
      }
    }
    return resultado;
  }

  private impuestosConImporte<T>(
    datos: T[],
    definiciones: Array<{
      nombre: string;
      obtenerImporte: (dato: T) => number | null | undefined;
    }>,
  ) {
    return definiciones.filter(definicion => datos.some(dato =>
      this.tieneImporte(definicion.obtenerImporte(dato))));
  }

  private columnasImpuestosOpcionales<T>(
    dato: T,
    definiciones: Array<{
      nombre: string;
      obtenerImporte: (dato: T) => number | null | undefined;
    }>,
  ): Record<string, number> {
    return Object.fromEntries(definiciones.map(definicion => [
      definicion.nombre,
      definicion.obtenerImporte(dato) ?? 0,
    ]));
  }

  private tieneImporte(valor: number | null | undefined): boolean {
    return Math.abs(valor ?? 0) > 0.0001;
  }

  private columnasPagos(
    pagos: InformeContablePago[] | null | undefined,
    monedaDocumento: string,
  ): Record<string, number | string> {
    const pagosRegistrados = pagos ?? [];
    const columnas: Record<string, number | string> = {
      FormaPago: this.valorOGuion(this.unirUnicos(
        pagosRegistrados.map(pago => pago.FormaPago),
      )),
      Banco: this.valorOGuion(this.unirUnicos(
        pagosRegistrados
          .filter(pago => this.esPagoBancario(pago))
          .map(pago => this.descripcionBanco(pago)),
      )),
      'N.º de operación': this.valorOGuion(this.unirUnicos(
        pagosRegistrados
          .filter(pago => this.esPagoBancario(pago))
          .map(pago => pago.NumeroOperacion),
      )),
    };

    if (this.paisISO2 === 'PE') {
      for (const moneda of this.monedasDePago(pagosRegistrados)) {
        columnas[`Monto bancario ${moneda.Descripcion}`] = this.sumar(
          pagosRegistrados.filter(pago =>
            this.esPagoBancario(pago) && pago.IdMoneda === moneda.IdMoneda),
          pago => pago.MontoRecibido,
        );
      }
      for (const moneda of this.monedasDePago(pagosRegistrados)) {
        columnas[`${moneda.Descripcion} Efectivo`] = this.sumar(
          pagosRegistrados.filter(pago =>
            this.esEfectivo(pago) && pago.IdMoneda === moneda.IdMoneda),
          pago => pago.MontoEquivalente,
        );
      }
      columnas['Tipo de cambio'] = this.valorOGuion(
        this.tiposCambioDeConversion(pagosRegistrados, monedaDocumento),
      );
      columnas.Equivalente = this.sumar(
        pagosRegistrados.filter(pago =>
          this.esPagoEquivalente(pago, monedaDocumento)),
        pago => pago.MontoEquivalente,
      );
    } else {
      columnas['Monto bancario'] = this.sumar(
        pagosRegistrados.filter(pago => this.esPagoBancario(pago)),
        pago => pago.MontoRecibido,
      );
      columnas.Efectivo = this.sumar(
        pagosRegistrados.filter(pago => this.esEfectivo(pago)),
        pago => pago.MontoEquivalente,
      );
    }

    for (const tarjeta of this.tarjetas) {
      columnas[tarjeta.Descripcion] = this.sumar(
        pagosRegistrados.filter(pago => pago.IdTarjeta === tarjeta.IdTarjeta),
        pago => pago.MontoEquivalente,
      );
    }
    columnas['Autorización'] = this.valorOGuion(this.unirUnicos(
      pagosRegistrados
        .filter(pago => this.esPagoTarjeta(pago))
        .map(pago => pago.Autorizacion),
    ));
    columnas.Propina = this.sumar(pagosRegistrados, pago => pago.Propina);
    return columnas;
  }

  private descripcionBanco(pago: InformeContablePago): string | null {
    if (!pago.BancoDestino) return null;
    return `${pago.BancoDestino} - ${this.descripcionMoneda(pago)}`;
  }

  private descripcionMoneda(pago: InformeContablePago): string {
    return pago.BancoMonedaDescripcion?.trim()
      || pago.MonedaDescripcion?.trim()
      || 'Sin moneda configurada';
  }

  private monedasDePago(pagos: InformeContablePago[]): MonedaCobro[] {
    if (this.monedasCobro.length > 0) return this.monedasCobro;
    return Array.from(new Map(pagos.map(pago => [pago.IdMoneda, {
      IdMoneda: pago.IdMoneda,
      Descripcion: pago.MonedaDescripcion || pago.IdMoneda,
    }])).values());
  }

  private esPagoBancario(pago: InformeContablePago): boolean {
    return !!pago.IdBanco || !!pago.BancoDestino;
  }

  private esEfectivo(pago: InformeContablePago): boolean {
    return pago.IdTipoPago === 1;
  }

  private esPagoTarjeta(pago: InformeContablePago): boolean {
    return !!pago.IdTarjeta;
  }

  private esPagoEquivalente(
    pago: InformeContablePago,
    monedaDocumento: string,
  ): boolean {
    if (this.esPagoTarjeta(pago)) return false;
    if (monedaDocumento && pago.IdMoneda && pago.IdMoneda !== monedaDocumento) return true;
    return !this.esPagoBancario(pago) && !this.esEfectivo(pago);
  }

  private tiposCambioDeConversion(
    pagos: InformeContablePago[],
    monedaDocumento: string,
  ): string {
    return String(this.tiposCambio(pagos.filter(pago =>
      !!monedaDocumento && pago.IdMoneda !== monedaDocumento)));
  }

  private valorOGuion(valor: string): string {
    return valor || '-';
  }

  private sumar(
    pagos: InformeContablePago[],
    selector: (pago: InformeContablePago) => number,
  ): number {
    return Number(pagos.reduce((total, pago) => total + Number(selector(pago) || 0), 0).toFixed(2));
  }

  private tiposCambio(pagos: InformeContablePago[]): number | string {
    const tipos = Array.from(new Set(pagos.map(pago => Number(pago.TipoCambio || 1))));
    return tipos
      .map(tipo => this.regionalNumberFormatter.formatNumber(tipo, this.paisISO2))
      .join(' | ');
  }

  private formatearFilaContable<T extends object>(fila: T): Record<string, unknown> {
    return Object.fromEntries(Object.entries(fila).map(([columna, valor]) => {
      if (typeof valor !== 'number') return [columna, valor];
      if (columna === 'IdVenta') return [columna, valor];
      const valorFormateado = columna === 'Tipo de cambio' || columna === 'PorcentajeIGV'
        ? this.regionalNumberFormatter.formatNumber(valor, this.paisISO2)
        : this.regionalNumberFormatter.formatAmount(valor, this.paisISO2);
      return [columna, valorFormateado];
    }));
  }

  private unirUnicos(valores: Array<string | null | undefined>): string {
    return Array.from(new Set(valores.map(valor => valor?.trim()).filter(
      (valor): valor is string => !!valor,
    ))).join(' | ');
  }

  private estadoCuadre(diferencia: number): string {
    return Math.abs(diferencia ?? 0) > 0.01 ? 'REVISAR' : 'OK';
  }
}
