import { formatDate } from '@angular/common';
import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import {
  ColumnaReporteVentas,
  FormatoColumnaReporte,
  IndicadorReporteVentas,
  PuntoGraficoReporteVentas,
  ReporteVentasDefinicion,
  ReporteVentasRespuesta,
  TipoReporteVentas
} from 'src/app/models/reportes-ventas.models';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { ReportesVentasService } from 'src/app/services/reportes-ventas.service';

interface ConfiguracionVisualReporte extends ReporteVentasDefinicion {
  indicadores: IndicadorReporteVentas[];
  columnas: ColumnaReporteVentas[];
  graficoEtiqueta: string;
  graficoValor: string;
  graficoValorEtiqueta?: string;
  graficoFormato?: FormatoColumnaReporte;
  graficoValorSecundario?: string;
  graficoValorSecundarioEtiqueta?: string;
  graficoFormatoSecundario?: FormatoColumnaReporte;
  graficoAgrupar?: boolean;
  ayuda: string;
}

@Component({
  selector: 'app-reporte-ventas-analitico',
  templateUrl: './reporte-ventas-analitico.component.html'
})
export class ReporteVentasAnaliticoComponent implements OnInit {
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) this.dataSource.paginator = value;
  }

  readonly dataSource = new MatTableDataSource<Record<string, unknown>>([]);
  readonly configuracion: ConfiguracionVisualReporte;
  fechaDesde = this.formatearFecha(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  fechaHasta = this.formatearFecha(new Date());
  resultado: ReporteVentasRespuesta | null = null;
  puntosGrafico: PuntoGraficoReporteVentas[] = [];
  filtro = '';
  monedaSimbolo = '';
  cargando = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: { tipo: TipoReporteVentas },
    private readonly dialogRef: MatDialogRef<ReporteVentasAnaliticoComponent>,
    private readonly reportesService: ReportesVentasService,
    private readonly configuracionService: ConfiguracionService
  ) {
    this.configuracion = this.crearConfiguracion(data.tipo);
    this.dataSource.filterPredicate = (item, filter) =>
      this.normalizar(Object.values(item).join(' ')).includes(filter);
  }

  get displayedColumns(): string[] {
    return this.configuracion.columnas.map(columna => columna.campo);
  }

  get maximoGrafico(): number {
    return Math.max(...this.puntosGrafico.map(punto => punto.valor), 1);
  }

  ngOnInit(): void {
    const configuracion = this.configuracionService.snapshot;
    if (configuracion) {
      this.monedaSimbolo = configuracion.SimboloMoneda || '';
    } else {
      this.configuracionService.get().subscribe({
        next: value => this.monedaSimbolo = value.SimboloMoneda || '',
        error: () => this.monedaSimbolo = ''
      });
    }
    this.consultar();
  }

  consultar(): void {
    if (!this.fechaDesde || !this.fechaHasta || this.fechaDesde > this.fechaHasta) {
      Swal.fire('Rango inválido', 'La fecha inicial no puede ser posterior a la final.', 'warning');
      return;
    }

    this.cargando = true;
    this.reportesService.consultar(this.data.tipo, this.fechaDesde, this.fechaHasta).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.Success) {
          this.mostrarError(response.Message);
          return;
        }
        this.resultado = response.Data;
        this.dataSource.data = response.Data?.Items ?? [];
        this.construirGrafico();
        this.aplicarFiltro();
      },
      error: error => {
        this.cargando = false;
        this.resultado = null;
        this.dataSource.data = [];
        this.puntosGrafico = [];
        this.mostrarError(error?.error?.Message || `No se pudo consultar ${this.configuracion.titulo.toLowerCase()}.`);
      }
    });
  }

  aplicarFiltro(): void {
    this.dataSource.filter = this.normalizar(this.filtro);
    this.dataSource.paginator?.firstPage();
  }

  valorIndicador(indicador: IndicadorReporteVentas): unknown {
    return this.resultado?.[indicador.campo] ?? 0;
  }

  formatearValor(valor: unknown, formato: FormatoColumnaReporte = 'texto'): string {
    if (valor === null || valor === undefined || valor === '') return '—';
    const numero = Number(valor);
    switch (formato) {
      case 'numero': return Number.isFinite(numero) ? numero.toLocaleString('es-ES', { maximumFractionDigits: 0 }) : String(valor);
      case 'decimal': return Number.isFinite(numero) ? numero.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(valor);
      case 'moneda': return `${this.monedaSimbolo} ${Number.isFinite(numero) ? numero.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : valor}`.trim();
      case 'porcentaje': return `${Number.isFinite(numero) ? numero.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : valor} %`;
      case 'duracion': return this.formatearDuracion(numero);
      case 'fecha': return this.formatearFechaVisible(valor);
      case 'fechaHora': return this.formatearFechaHoraVisible(valor);
      case 'estado': return typeof valor === 'boolean' ? (valor ? 'Sí' : 'No') : String(valor);
      default: return String(valor);
    }
  }

  anchoBarra(punto: PuntoGraficoReporteVentas): number {
    return Math.max((punto.valor / this.maximoGrafico) * 100, punto.valor > 0 ? 3 : 0);
  }

  textoGrafico(valor: number, formato?: FormatoColumnaReporte): string {
    return this.formatearValor(valor, formato ?? 'decimal');
  }

  exportarExcel(): void {
    const items = this.dataSource.filteredData;
    if (!items.length) {
      Swal.fire('Sin registros', 'No hay información para exportar.', 'info');
      return;
    }
    const filas = items.map(item => Object.fromEntries(
      this.configuracion.columnas.map(columna => [columna.etiqueta, item[columna.campo] ?? ''])
    ));
    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Reporte');
    XLSX.writeFile(libro, `${this.data.tipo}_${this.fechaDesde}_${this.fechaHasta}.xlsx`);
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  private construirGrafico(): void {
    const items = this.resultado?.Items ?? [];
    if (this.configuracion.graficoAgrupar) {
      const agrupado = new Map<string, number>();
      items.forEach(item => {
        const etiqueta = String(item[this.configuracion.graficoEtiqueta] ?? 'Sin clasificar');
        agrupado.set(etiqueta, (agrupado.get(etiqueta) ?? 0) + 1);
      });
      this.puntosGrafico = [...agrupado.entries()]
        .map(([etiqueta, valor]) => ({ etiqueta, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 8);
      return;
    }

    this.puntosGrafico = items
      .map(item => ({
        etiqueta: String(item[this.configuracion.graficoEtiqueta] ?? 'Sin nombre'),
        valor: Number(item[this.configuracion.graficoValor] ?? 0),
        valorSecundario: this.configuracion.graficoValorSecundario
          ? Number(item[this.configuracion.graficoValorSecundario] ?? 0)
          : undefined
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);
  }

  private crearConfiguracion(tipo: TipoReporteVentas): ConfiguracionVisualReporte {
    const configs: Record<TipoReporteVentas, ConfiguracionVisualReporte> = {
      'productividad-empleados': {
        tipo, titulo: 'Productividad por empleado', descripcion: 'Distingue la venta digitada por el personal de los pedidos hechos por el cliente mediante QR.', icono: 'groups',
        ayuda: 'Venta / hora solo utiliza lo que digitó el empleado. Los pedidos QR se muestran aparte bajo la responsabilidad de quien atendió la mesa. Los datos anteriores a esta medición aparecen como origen no identificado para no atribuirlos incorrectamente.',
        indicadores: [
          { campo: 'VentaDigitadaTotal', etiqueta: 'Digitado por personal', icono: 'person', formato: 'moneda', tono: 'positivo' },
          { campo: 'VentaQrTotal', etiqueta: 'Pedido por clientes QR', icono: 'qr_code_2', formato: 'moneda' },
          { campo: 'VentaTotal', etiqueta: 'Venta total atendida', icono: 'payments', formato: 'moneda' },
          { campo: 'VentaOrigenNoIdentificadoTotal', etiqueta: 'Histórico sin origen', icono: 'help_outline', formato: 'moneda', tono: 'advertencia' }
        ],
        columnas: [
          { campo: 'Empleado', etiqueta: 'Empleado responsable' }, { campo: 'VentaDigitada', etiqueta: 'Digitado por empleado', formato: 'moneda' },
          { campo: 'VentaQrAtendida', etiqueta: 'Pedido por QR', formato: 'moneda' }, { campo: 'VentaOrigenNoIdentificado', etiqueta: 'Origen no identificado', formato: 'moneda' },
          { campo: 'VentaNeta', etiqueta: 'Total atendido', formato: 'moneda' }, { campo: 'ParticipacionQrPorcentaje', etiqueta: '% QR', formato: 'porcentaje' },
          { campo: 'Documentos', etiqueta: 'Documentos atendidos', formato: 'numero' }, { campo: 'Pedidos', etiqueta: 'Pedidos atendidos', formato: 'numero' },
          { campo: 'TicketMedio', etiqueta: 'Ticket medio atendido', formato: 'moneda' },
          { campo: 'HorasTrabajadas', etiqueta: 'Horas', formato: 'decimal' }, { campo: 'VentaPorHora', etiqueta: 'Venta digitada / hora', formato: 'moneda' },
          { campo: 'Anulaciones', etiqueta: 'Anulaciones', formato: 'numero' }
        ], graficoEtiqueta: 'Empleado', graficoValor: 'VentaPorHora', graficoValorEtiqueta: 'Venta digitada / hora', graficoFormato: 'moneda',
        graficoValorSecundario: 'VentaQrAtendida', graficoValorSecundarioEtiqueta: 'Pedido por clientes QR', graficoFormatoSecundario: 'moneda'
      },
      'mesas-servicio': {
        tipo, titulo: 'Mesas y servicio', descripcion: 'Ocupación, rotación, comensales y rendimiento de cada mesa.', icono: 'table_restaurant',
        ayuda: 'La duración solo se calcula cuando el servicio tiene apertura y cierre registrados; el reporte indica cuántos servicios disponen de ese dato.',
        indicadores: [
          { campo: 'VentaTotal', etiqueta: 'Venta en mesa', icono: 'payments', formato: 'moneda', tono: 'positivo' },
          { campo: 'Servicios', etiqueta: 'Servicios', icono: 'room_service', formato: 'numero' },
          { campo: 'Comensales', etiqueta: 'Comensales', icono: 'groups', formato: 'numero' },
          { campo: 'DuracionPromedioMinutos', etiqueta: 'Duración media', icono: 'timer', formato: 'duracion' }
        ],
        columnas: [
          { campo: 'Ambiente', etiqueta: 'Ambiente' }, { campo: 'Mesa', etiqueta: 'Mesa' }, { campo: 'Servicios', etiqueta: 'Servicios', formato: 'numero' },
          { campo: 'Pedidos', etiqueta: 'Pedidos', formato: 'numero' }, { campo: 'Comensales', etiqueta: 'Comensales', formato: 'numero' },
          { campo: 'VentaNeta', etiqueta: 'Venta neta', formato: 'moneda' }, { campo: 'TicketMedio', etiqueta: 'Ticket medio', formato: 'moneda' },
          { campo: 'VentaPorComensal', etiqueta: 'Venta / comensal', formato: 'moneda' }, { campo: 'DuracionPromedioMinutos', etiqueta: 'Duración media', formato: 'duracion' }
        ], graficoEtiqueta: 'Mesa', graficoValor: 'VentaNeta', graficoValorEtiqueta: 'Venta neta', graficoFormato: 'moneda',
        graficoValorSecundario: 'Servicios', graficoValorSecundarioEtiqueta: 'Servicios', graficoFormatoSecundario: 'numero'
      },
      'productos-sin-rotacion': {
        tipo, titulo: 'Productos sin rotación', descripcion: 'Detecta productos activos que no se venden o llevan demasiado tiempo parados.', icono: 'inventory',
        ayuda: 'Incluye productos activos aunque nunca hayan sido vendidos. Esto permite limpiar la carta sin confundir ausencia de ventas con falta de datos.',
        indicadores: [
          { campo: 'ProductosAnalizados', etiqueta: 'Productos activos', icono: 'restaurant_menu', formato: 'numero' },
          { campo: 'SinVentasEnPeriodo', etiqueta: 'Sin venta en el período', icono: 'remove_shopping_cart', formato: 'numero', tono: 'advertencia' },
          { campo: 'NuncaVendidos', etiqueta: 'Nunca vendidos', icono: 'new_releases', formato: 'numero', tono: 'critico' }
        ],
        columnas: [
          { campo: 'Producto', etiqueta: 'Producto' }, { campo: 'Grupo', etiqueta: 'Grupo' }, { campo: 'SeccionMenu', etiqueta: 'Sección' },
          { campo: 'PrecioActual', etiqueta: 'Precio actual', formato: 'moneda' }, { campo: 'CantidadVendidaPeriodo', etiqueta: 'Unidades período', formato: 'numero' },
          { campo: 'VentaPeriodo', etiqueta: 'Venta período', formato: 'moneda' }, { campo: 'UltimaVenta', etiqueta: 'Última venta', formato: 'fecha' },
          { campo: 'DiasSinVenta', etiqueta: 'Días sin venta', formato: 'numero' }, { campo: 'NuncaVendido', etiqueta: 'Nunca vendido', formato: 'estado' }
        ], graficoEtiqueta: 'Producto', graficoValor: 'DiasSinVenta', graficoValorEtiqueta: 'Días sin venta', graficoFormato: 'numero'
      },
      'efectividad-descuentos': {
        tipo, titulo: 'Efectividad de descuentos', descripcion: 'Impacto real de descuentos y cupones sobre venta y documentos.', icono: 'percent',
        ayuda: 'Se muestran descuentos efectivamente aplicados. No se atribuyen ventas a una promoción si la venta no guarda esa relación.',
        indicadores: [
          { campo: 'VentaTotal', etiqueta: 'Venta total', icono: 'payments', formato: 'moneda' },
          { campo: 'VentaConDescuento', etiqueta: 'Venta con descuento', icono: 'shopping_cart', formato: 'moneda' },
          { campo: 'DescuentosTotal', etiqueta: 'Importe descontado', icono: 'sell', formato: 'moneda', tono: 'advertencia' },
          { campo: 'PenetracionDocumentosPorcentaje', etiqueta: 'Documentos afectados', icono: 'donut_large', formato: 'porcentaje' }
        ],
        columnas: [
          { campo: 'Descuento', etiqueta: 'Descuento' }, { campo: 'Tipo', etiqueta: 'Tipo' }, { campo: 'Documentos', etiqueta: 'Documentos', formato: 'numero' },
          { campo: 'Unidades', etiqueta: 'Unidades', formato: 'numero' }, { campo: 'Cupones', etiqueta: 'Cupones', formato: 'numero' },
          { campo: 'VentaBruta', etiqueta: 'Venta bruta', formato: 'moneda' }, { campo: 'ImporteDescontado', etiqueta: 'Descontado', formato: 'moneda' },
          { campo: 'VentaNeta', etiqueta: 'Venta neta', formato: 'moneda' }, { campo: 'DescuentoEfectivoPorcentaje', etiqueta: 'Descuento efectivo', formato: 'porcentaje' },
          { campo: 'ParticipacionVentaPorcentaje', etiqueta: 'Participación', formato: 'porcentaje' }
        ], graficoEtiqueta: 'Descuento', graficoValor: 'VentaNeta', graficoValorEtiqueta: 'Venta neta', graficoFormato: 'moneda',
        graficoValorSecundario: 'ImporteDescontado', graficoValorSecundarioEtiqueta: 'Descontado', graficoFormatoSecundario: 'moneda'
      },
      'clientes-recurrencia': {
        tipo, titulo: 'Clientes y recurrencia', descripcion: 'Frecuencia, valor y segmentos de clientes identificados.', icono: 'loyalty',
        ayuda: 'La recurrencia solo puede medirse en ventas asociadas a un cliente. La cobertura indica qué parte de la venta está correctamente identificada.',
        indicadores: [
          { campo: 'VentaTotal', etiqueta: 'Venta total', icono: 'payments', formato: 'moneda' },
          { campo: 'CoberturaIdentificacionPorcentaje', etiqueta: 'Venta identificada', icono: 'verified_user', formato: 'porcentaje' },
          { campo: 'ClientesNuevos', etiqueta: 'Clientes nuevos', icono: 'person_add', formato: 'numero', tono: 'positivo' },
          { campo: 'ClientesRecurrentes', etiqueta: 'Recurrentes', icono: 'repeat', formato: 'numero' }
        ],
        columnas: [
          { campo: 'Cliente', etiqueta: 'Cliente' }, { campo: 'NumeroIdentificacion', etiqueta: 'Identificación' }, { campo: 'Segmento', etiqueta: 'Segmento' },
          { campo: 'Visitas', etiqueta: 'Visitas', formato: 'numero' }, { campo: 'VentaTotal', etiqueta: 'Venta total', formato: 'moneda' },
          { campo: 'TicketMedio', etiqueta: 'Ticket medio', formato: 'moneda' }, { campo: 'PrimeraCompra', etiqueta: 'Primera compra', formato: 'fecha' },
          { campo: 'UltimaCompra', etiqueta: 'Última compra', formato: 'fecha' }, { campo: 'DiasDesdeUltimaCompra', etiqueta: 'Días desde compra', formato: 'numero' },
          { campo: 'CanalPreferido', etiqueta: 'Canal preferido' }
        ], graficoEtiqueta: 'Cliente', graficoValor: 'VentaTotal', graficoValorEtiqueta: 'Venta total', graficoFormato: 'moneda',
        graficoValorSecundario: 'Visitas', graficoValorSecundarioEtiqueta: 'Visitas', graficoFormatoSecundario: 'numero'
      },
      'incidencias-operativas': {
        tipo, titulo: 'Incidencias operativas', descripcion: 'Anulaciones, descuentos sensibles y cuentas que requieren revisión.', icono: 'report_problem',
        ayuda: 'Este informe prioriza hechos operativos trazables. Una incidencia es una señal para revisar, no una acusación al empleado.',
        indicadores: [
          { campo: 'TotalIncidencias', etiqueta: 'Incidencias', icono: 'fact_check', formato: 'numero' },
          { campo: 'Criticas', etiqueta: 'Críticas', icono: 'error', formato: 'numero', tono: 'critico' },
          { campo: 'Advertencias', etiqueta: 'Advertencias', icono: 'warning', formato: 'numero', tono: 'advertencia' },
          { campo: 'ImporteAfectado', etiqueta: 'Importe afectado', icono: 'payments', formato: 'moneda' }
        ],
        columnas: [
          { campo: 'Tipo', etiqueta: 'Tipo' }, { campo: 'Severidad', etiqueta: 'Severidad', formato: 'estado' }, { campo: 'FechaUtc', etiqueta: 'Fecha local', formato: 'fechaHora' },
          { campo: 'Referencia', etiqueta: 'Referencia' }, { campo: 'Empleado', etiqueta: 'Empleado' }, { campo: 'Usuario', etiqueta: 'Usuario' },
          { campo: 'Detalle', etiqueta: 'Detalle' }, { campo: 'Importe', etiqueta: 'Importe', formato: 'moneda' }
        ], graficoEtiqueta: 'Tipo', graficoValor: 'Importe', graficoValorEtiqueta: 'Incidencias', graficoFormato: 'numero', graficoAgrupar: true
      },
      'calidad-documental': {
        tipo, titulo: 'Calidad documental', descripcion: 'Documentos correctos, pendientes, rechazados y correcciones fiscales.', icono: 'verified',
        ayuda: 'Permite actuar antes de que una incidencia fiscal se convierta en un problema de cierre o presentación.',
        indicadores: [
          { campo: 'Documentos', etiqueta: 'Documentos', icono: 'receipt_long', formato: 'numero' },
          { campo: 'Correctos', etiqueta: 'Correctos', icono: 'task_alt', formato: 'numero', tono: 'positivo' },
          { campo: 'SinEnviar', etiqueta: 'Sin enviar', icono: 'schedule_send', formato: 'numero', tono: 'advertencia' },
          { campo: 'Rechazados', etiqueta: 'Rechazados', icono: 'cancel', formato: 'numero', tono: 'critico' }
        ],
        columnas: [
          { campo: 'Fecha', etiqueta: 'Fecha', formato: 'fecha' }, { campo: 'Documento', etiqueta: 'Documento' }, { campo: 'TipoDocumento', etiqueta: 'Tipo' },
          { campo: 'Cliente', etiqueta: 'Cliente' }, { campo: 'Total', etiqueta: 'Total', formato: 'moneda' }, { campo: 'EstadoVenta', etiqueta: 'Venta', formato: 'estado' },
          { campo: 'EstadoFiscal', etiqueta: 'Estado fiscal', formato: 'estado' }, { campo: 'Incidencia', etiqueta: 'Incidencia' },
          { campo: 'CorreccionesPendientes', etiqueta: 'Correcciones', formato: 'numero' }, { campo: 'UltimoErrorFiscal', etiqueta: 'Último error' }
        ], graficoEtiqueta: 'EstadoFiscal', graficoValor: 'IdVenta', graficoValorEtiqueta: 'Documentos con incidencia', graficoFormato: 'numero', graficoAgrupar: true
      },
      'incidencias-jornada': {
        tipo, titulo: 'Incidencias de jornada', descripcion: 'Jornadas abiertas, excesivas o corregidas que requieren seguimiento.', icono: 'more_time',
        ayuda: 'Los eventos se guardan en UTC y aquí se presentan en la hora local del navegador. Las correcciones permanecen auditadas.',
        indicadores: [
          { campo: 'JornadasAnalizadas', etiqueta: 'Jornadas analizadas', icono: 'event_available', formato: 'numero' },
          { campo: 'JornadasConIncidencia', etiqueta: 'Con incidencia', icono: 'rule', formato: 'numero', tono: 'advertencia' },
          { campo: 'JornadasAbiertas', etiqueta: 'Aún abiertas', icono: 'timer_off', formato: 'numero', tono: 'critico' },
          { campo: 'JornadasCorregidas', etiqueta: 'Corregidas', icono: 'history', formato: 'numero' }
        ],
        columnas: [
          { campo: 'Empleado', etiqueta: 'Empleado' }, { campo: 'InicioUtc', etiqueta: 'Entrada local', formato: 'fechaHora' }, { campo: 'FinUtc', etiqueta: 'Salida local', formato: 'fechaHora' },
          { campo: 'MinutosTrabajados', etiqueta: 'Tiempo trabajado', formato: 'duracion' }, { campo: 'MinutosPausa', etiqueta: 'Pausas', formato: 'duracion' },
          { campo: 'Tipo', etiqueta: 'Incidencia' }, { campo: 'Severidad', etiqueta: 'Severidad', formato: 'estado' }, { campo: 'Detalle', etiqueta: 'Detalle' },
          { campo: 'Correcciones', etiqueta: 'Correcciones', formato: 'numero' }
        ], graficoEtiqueta: 'Tipo', graficoValor: 'IdRegistroJornada', graficoValorEtiqueta: 'Jornadas con incidencia', graficoFormato: 'numero', graficoAgrupar: true
      }
    };
    return configs[tipo];
  }

  private formatearDuracion(minutos: number): string {
    if (!Number.isFinite(minutos)) return '—';
    const horas = Math.floor(minutos / 60);
    const resto = Math.round(minutos % 60);
    return horas > 0 ? `${horas} h ${resto} min` : `${resto} min`;
  }

  private formatearFechaVisible(valor: unknown): string {
    const texto = String(valor);
    const partes = texto.substring(0, 10).split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : texto;
  }

  private formatearFechaHoraVisible(valor: unknown): string {
    const fecha = new Date(String(valor));
    return Number.isNaN(fecha.getTime()) ? String(valor) : fecha.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  }

  private formatearFecha(fecha: Date): string {
    return formatDate(fecha, 'yyyy-MM-dd', 'en-US');
  }

  private normalizar(valor: unknown): string {
    return String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  }

  private mostrarError(mensaje: string): void {
    Swal.fire('No se pudo cargar el reporte', mensaje, 'error');
  }
}
