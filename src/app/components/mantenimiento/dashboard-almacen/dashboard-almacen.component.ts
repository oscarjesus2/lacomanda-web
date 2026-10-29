import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { catchError, forkJoin, from, map, mergeMap, of, Subscription, toArray } from 'rxjs';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { AnalisisAlmacenComponent } from '../analisis-almacen/analisis-almacen.component';
import { CoberturaStockReporteComponent } from '../cobertura-stock-reporte/cobertura-stock-reporte.component';
import { ConsumoTeoricoRealReporteComponent } from '../consumo-teorico-real-reporte/consumo-teorico-real-reporte.component';
import { RentabilidadProductoCanalReporteComponent } from '../rentabilidad-producto-canal-reporte/rentabilidad-producto-canal-reporte.component';
import { AnalisisAlmacenService, FilaAnalisisAlmacen } from 'src/app/services/analisis-almacen.service';
import { ReportesAlmacenService } from 'src/app/services/reportes-almacen.service';
import { LicenciaTenantService } from 'src/app/services/licencia-tenant.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { CARACTERISTICAS_LICENCIA as C } from 'src/app/constants/caracteristicas-licencia';
import { CoberturaStockReporte, ConsumoTeoricoRealReporte, RentabilidadProductoCanalReporte } from 'src/app/models/reportes-almacen.models';
import { fechaReporte, imprimirReporte, FilaImpresion } from 'src/app/shared/impresion/imprimir-reporte';
import { dividirPorMes, porcentajeMerma, puedeVerDashboardAlmacen, RangoMensual } from './dashboard-almacen.utils';

interface Compra { IdProveedor: number; Proveedor: string; Moneda: string; Importe: number; }
interface Merma { IdArticulo: number; Articulo: string; IdUnidad: number; Unidad: string; IdSubArea: number; SubArea: string; CantidadBruta: number; Merma: number; PorcentajeMerma: number | null; }
interface Mes { rango: RangoMensual; compras: Compra[] | null; mermas: Merma[] | null; }
interface Barra { etiqueta: string; valor: number; texto: string; ancho: number; }

@Component({ selector: 'app-dashboard-almacen', templateUrl: './dashboard-almacen.component.html' })
export class DashboardAlmacenComponent implements OnInit, OnDestroy {
  fechaHasta = this.fechaInput(new Date());
  fechaDesde = this.fechaInput(new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1));
  moneda = '';
  proveedor = 0;
  subarea = 0;
  articuloMerma = '';
  cargando = false;
  autorizado = false;
  comprobando = true;
  tieneCompras = false;
  errorCobertura = false;
  errorInventarios = false;
  errorRentabilidad = false;
  errorCompras = false;
  errorMermas = false;
  periodo = '';
  cobertura: CoberturaStockReporte | null = null;
  inventarios: ConsumoTeoricoRealReporte | null = null;
  rentabilidad: RentabilidadProductoCanalReporte | null = null;
  compras: Compra[] = [];
  mermas: Merma[] = [];
  meses: Mes[] = [];
  private peticion?: Subscription;
  private autorizacion?: Subscription;

  constructor(
    private readonly dialogRef: MatDialogRef<DashboardAlmacenComponent>,
    private readonly dialog: MatDialog,
    private readonly usuario: UsuarioService,
    private readonly licencia: LicenciaTenantService,
    private readonly analisis: AnalisisAlmacenService,
    private readonly reportes: ReportesAlmacenService,
  ) {}

  ngOnInit(): void {
    this.autorizacion = forkJoin({ usuario: this.usuario.getUsuarioActual().pipe(catchError(() => of(null))),
      licencia: this.licencia.obtenerEstado() }).subscribe(({ usuario, licencia }) => {
      this.comprobando = false;
      this.autorizado = puedeVerDashboardAlmacen(usuario?.Data) &&
        this.licencia.evaluar(licencia, [C.AlmacenGestion, C.OperacionReportes]);
      this.tieneCompras = this.licencia.evaluar(licencia, [C.AlmacenCompras, C.OperacionReportes]);
      if (this.autorizado) this.consultar();
    });
  }

  ngOnDestroy(): void { this.autorizacion?.unsubscribe(); this.peticion?.unsubscribe(); }

  consultar(): void {
    const meses = dividirPorMes(this.fechaDesde, this.fechaHasta);
    if (!meses.length || meses.length > 12) {
      Swal.fire('Período inválido', 'Seleccione un período válido de hasta 12 meses de calendario.', 'warning');
      return;
    }
    this.peticion?.unsubscribe();
    const desde = this.fechaDesde;
    const hasta = this.fechaHasta;
    this.cargando = true;
    const consultaMeses = from(meses).pipe(mergeMap(rango => forkJoin({
      compras: this.tieneCompras ? this.consultaAnalisis('concentracion-compras', rango.desde, rango.hasta) : of(null),
      mermas: this.consultaAnalisis('mermas', rango.desde, rango.hasta),
    }).pipe(map(datos => ({ rango, compras: datos.compras as unknown as Compra[] | null, mermas: datos.mermas as unknown as Merma[] | null }))), 3), toArray());
    this.peticion = forkJoin({
      cobertura: this.reportes.consultarCoberturaStock(desde, hasta).pipe(map(r => r.Success ? r.Data : null), catchError(() => of(null))),
      inventarios: this.reportes.consultarConsumoTeoricoReal(desde, hasta).pipe(map(r => r.Success ? r.Data : null), catchError(() => of(null))),
      rentabilidad: this.reportes.consultarRentabilidadProductoCanal(desde, hasta).pipe(map(r => r.Success ? r.Data : null), catchError(() => of(null))),
      compras: this.tieneCompras ? this.consultaAnalisis('concentracion-compras', desde, hasta) : of(null),
      mermas: this.consultaAnalisis('mermas', desde, hasta),
      meses: consultaMeses,
    }).subscribe(datos => {
      this.cargando = false;
      this.periodo = `${desde} — ${hasta}`;
      this.cobertura = datos.cobertura;
      this.inventarios = datos.inventarios;
      this.rentabilidad = datos.rentabilidad;
      this.errorCobertura = !datos.cobertura;
      this.errorInventarios = !datos.inventarios;
      this.errorRentabilidad = !datos.rentabilidad;
      this.errorCompras = this.tieneCompras && !datos.compras;
      this.errorMermas = !datos.mermas;
      this.compras = (datos.compras || []) as unknown as Compra[];
      this.mermas = (datos.mermas || []) as unknown as Merma[];
      this.meses = datos.meses.sort((a, b) => a.rango.desde.localeCompare(b.rango.desde));
      if (!this.monedas.includes(this.moneda)) this.moneda = this.monedas[0] || '';
      if (!this.proveedores.some(x => x.id === this.proveedor)) this.proveedor = 0;
      if (!this.subareas.some(x => x.id === this.subarea)) this.subarea = 0;
      if (!this.articulosMerma.some(x => x.id === this.articuloMerma)) this.articuloMerma = this.articulosMerma[0]?.id || '';
    });
  }

  get monedas(): string[] {
    return Array.from(new Set([...this.compras.map(x => x.Moneda), ...(this.rentabilidad?.Items || []).map(x => x.IdMoneda)].filter(Boolean))).sort();
  }
  get proveedores(): { id: number; nombre: string }[] {
    return Array.from(new Map(this.compras.filter(x => x.Moneda === this.moneda).map(x => [x.IdProveedor, { id: x.IdProveedor, nombre: x.Proveedor }])).values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
  get subareas(): { id: number; nombre: string }[] {
    return Array.from(new Map([...this.mermas.map(x => ({ id: x.IdSubArea, nombre: x.SubArea })), ...(this.inventarios?.Items || []).map(x => ({ id: x.IdSubAreaAlmacen, nombre: x.SubAreaAlmacen }))].map(x => [x.id, x])).values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
  get articulosMerma(): { id: string; nombre: string }[] {
    return Array.from(new Map(this.mermas.filter(x => !this.subarea || x.IdSubArea === this.subarea).map(x => [`${x.IdArticulo}|${x.IdUnidad}`, { id: `${x.IdArticulo}|${x.IdUnidad}`, nombre: `${x.Articulo} · ${x.Unidad}` }])).values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
  filtrosCambiados(): void {
    if (!this.proveedores.some(x => x.id === this.proveedor)) this.proveedor = 0;
    if (!this.articulosMerma.some(x => x.id === this.articuloMerma)) this.articuloMerma = this.articulosMerma[0]?.id || '';
  }
  get serieCompras(): Barra[] {
    if (this.meses.some(m => !m.compras) || !this.moneda) return [];
    return this.barras(this.meses.map(m => ({ etiqueta: m.rango.etiqueta, valor: m.compras!.filter(x => x.Moneda === this.moneda && (!this.proveedor || x.IdProveedor === this.proveedor)).reduce((t, x) => t + x.Importe, 0) })), this.moneda);
  }
  get proveedoresGrafico(): Barra[] {
    return this.barras(this.compras.filter(x => x.Moneda === this.moneda && (!this.proveedor || x.IdProveedor === this.proveedor)).sort((a, b) => b.Importe - a.Importe).slice(0, 6).map(x => ({ etiqueta: x.Proveedor, valor: x.Importe })), this.moneda);
  }
  get serieMermas(): Barra[] {
    if (!this.articuloMerma || this.meses.some(m => !m.mermas)) return [];
    const [articulo, unidad] = this.articuloMerma.split('|').map(Number);
    return this.barras(this.meses.map(m => {
      const filas = m.mermas!.filter(x => x.IdArticulo === articulo && x.IdUnidad === unidad && (!this.subarea || x.IdSubArea === this.subarea));
      return { etiqueta: m.rango.etiqueta, valor: porcentajeMerma(filas) };
    }).filter((x): x is { etiqueta: string; valor: number } => x.valor !== null), '%');
  }
  get inventarioGrafico(): Barra[] {
    const filas = (this.inventarios?.Items || []).filter(x => x.StockSistema !== 0 && x.StockContado !== x.StockSistema && (!this.subarea || x.IdSubAreaAlmacen === this.subarea));
    return this.barras(filas.map(x => ({ etiqueta: `${x.Articulo} · ${x.SubAreaAlmacen} · #${x.IdInventario}`, valor: (x.StockContado - x.StockSistema) * 100 / Math.abs(x.StockSistema) })).sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor)).slice(0, 6), '%');
  }
  get margenGrafico(): Barra[] {
    const filas = (this.rentabilidad?.Items || []).filter(x => x.IdMoneda === this.moneda && x.CantidadAnalizada > 0);
    return this.barras(filas.sort((a, b) => b.Margen - a.Margen).slice(0, 6).map(x => ({ etiqueta: `${x.Producto} · ${x.CanalVenta}`, valor: x.Margen })), this.moneda);
  }
  get stockGrafico(): Barra[] {
    return this.barras((this.cobertura?.Items || []).filter(x => x.DiasCobertura !== null && x.DiasCobertura >= 0).sort((a, b) => a.DiasCobertura! - b.DiasCobertura!).slice(0, 6).map(x => ({ etiqueta: x.Articulo, valor: x.DiasCobertura! })), 'días');
  }
  get hayErroresMensuales(): boolean { return this.meses.some(m => !m.mermas || (this.tieneCompras && !m.compras)); }
  get sinCosto(): number { return (this.rentabilidad?.Items || []).filter(x => x.IdMoneda === this.moneda && x.VentasSinCosto > 0).length; }

  detalle(tipo: string): void {
    const componentes: Record<string, any> = { cobertura: CoberturaStockReporteComponent, inventarios: ConsumoTeoricoRealReporteComponent, rentabilidad: RentabilidadProductoCanalReporteComponent, compras: AnalisisAlmacenComponent, mermas: AnalisisAlmacenComponent };
    const acciones: Record<string, string> = { compras: 'concentracionComprasAlmacen', mermas: 'mermaAlmacen' };
    const [desde, hasta] = this.periodo.split(' — ');
    this.dialog.open(componentes[tipo], {
      width: 'calc(100vw - 32px)', height: 'calc(100vh - 32px)', maxWidth: '1240px', maxHeight: '880px',
      panelClass: 'dialog-window--workspace',
      data: { tipo: acciones[tipo], desde, hasta, subarea: this.subarea || null },
    });
  }

  imprimir(): void { imprimirReporte({ titulo: 'Dashboard gerencial de almacén', filas: this.filasExportacion(), detalles: this.detallesExportacion(), graficos: this.graficosImpresion() }); }
  exportar(): void {
    const filas = this.filasExportacion();
    if (!filas.length) { Swal.fire('Sin datos', 'No hay datos disponibles para exportar.', 'info'); return; }
    const libro = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas), 'Indicadores');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(this.detallesExportacion().map(detalle => ({ Detalle: detalle }))), 'Filtros');
    XLSX.writeFile(libro, `dashboard-almacen_${this.periodo.replace(' — ', '_')}.xlsx`);
  }
  cerrar(): void { this.dialogRef.close(); }

  private consultaAnalisis(ruta: string, desde: string, hasta: string) {
    const fecha = (valor: string, adicional: number) => { const [y, m, d] = valor.split('-').map(Number); return new Date(y, m - 1, d + adicional).toISOString(); };
    return this.analisis.consultar(ruta, fecha(desde, 0), fecha(hasta, 1)).pipe(map(r => r.Success ? r.Data : null), catchError(() => of(null)));
  }
  private barras(datos: { etiqueta: string; valor: number }[], unidad: string): Barra[] {
    const max = Math.max(0, ...datos.map(x => Math.abs(x.valor)));
    return datos.map(x => ({ ...x, ancho: max ? Math.abs(x.valor) * 100 / max : 0, texto: unidad === '%' || unidad === 'días' ? `${x.valor.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unidad}` : `${unidad} ${x.valor.toLocaleString(undefined, { maximumFractionDigits: 2 })}` }));
  }
  private filasExportacion(): FilaImpresion[] {
    const grupos: [string, Barra[]][] = [['Compras por mes', this.serieCompras], ['Compras por proveedor', this.proveedoresGrafico], ['Merma mensual', this.serieMermas], ['Diferencias de inventario', this.inventarioGrafico], ['Margen por producto y canal', this.margenGrafico], ['Cobertura de stock', this.stockGrafico]];
    const tarjetas: FilaImpresion[] = this.cobertura ? [
      { Indicador: 'Stock actual', Detalle: 'Artículos inventariables', Valor: this.cobertura.CantidadArticulos },
      { Indicador: 'Stock actual', Detalle: 'Sin stock', Valor: this.cobertura.ArticulosSinStock },
      { Indicador: 'Stock actual', Detalle: 'Bajo mínimo', Valor: this.cobertura.ArticulosBajoMinimo },
      { Indicador: 'Stock actual', Detalle: 'Sin consumo en el período', Valor: this.cobertura.ArticulosSinConsumo },
    ] : [];
    return tarjetas.concat(grupos.flatMap(([grupo, barras]) => barras.map(x => ({ Indicador: grupo, Detalle: x.etiqueta, Valor: x.texto }))));
  }
  private graficosImpresion() {
    return [
      { titulo: 'Menor cobertura de stock', barras: this.stockGrafico },
      { titulo: 'Compras por mes', barras: this.serieCompras },
      { titulo: 'Compras por proveedor', barras: this.proveedoresGrafico },
      { titulo: 'Merma mensual', barras: this.serieMermas },
      { titulo: 'Diferencias de inventario', barras: this.inventarioGrafico },
      { titulo: 'Margen por producto y canal', barras: this.margenGrafico },
    ];
  }
  private detallesExportacion(): string[] {
    return [`Período: ${this.periodo.split(' — ').map(fechaReporte).join(' — ')}`, `Moneda: ${this.moneda || 'Sin datos'}`, `Proveedor: ${this.proveedores.find(x => x.id === this.proveedor)?.nombre || 'Todos'}`, `Subárea: ${this.subareas.find(x => x.id === this.subarea)?.nombre || 'Todas'}`, 'La cobertura muestra stock actual; los demás indicadores corresponden al período consultado.', `Artículo para merma: ${this.articulosMerma.find(x => x.id === this.articuloMerma)?.nombre || 'Sin datos'}`, this.hayErroresMensuales ? 'Atención: algunas series mensuales no pudieron consultarse.' : '',
      this.errorCobertura || this.errorInventarios || this.errorRentabilidad || this.errorCompras || this.errorMermas ? 'Atención: algunos indicadores no pudieron consultarse.' : '', 'Los gráficos muestran hasta seis resultados, excepto las series mensuales.'];
  }
  private fechaInput(fecha: Date): string { return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`; }
}
