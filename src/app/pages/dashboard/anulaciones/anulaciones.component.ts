import { formatDate } from '@angular/common';
import { Component, OnInit, ElementRef, ViewChild, Input, SimpleChanges, OnDestroy } from '@angular/core';
import * as d3 from 'd3';
import { NgxSpinnerService } from 'ngx-spinner';
import { AnulacionDashboard } from 'src/app/models/anulacion-dashboard.models';
import { VentaService } from 'src/app/services/venta.service';
import { DashboardEnfoqueFecha } from 'src/app/models/dashboard-filtro.models';
import { ConfiguracionService } from 'src/app/services/configuracion.service';

interface AnulacionesPorProducto {
  Producto: string;
  Cantidad: number;
}

@Component({
  selector: 'app-anulaciones',
  templateUrl: './anulaciones.component.html',
  styleUrls: ['./anulaciones.component.css']
})
export class AnulacionesComponent implements OnInit, OnDestroy {
  @ViewChild('chart', { static: true }) private chartContainer: ElementRef;
  @Input() fechaInicial: Date;
  @Input() fechaFinal: Date;
  @Input() enfoque: DashboardEnfoqueFecha = 'FechaVenta';

  private rawData: AnulacionDashboard[] = [];
  data: AnulacionesPorProducto[] = [];

  selectedProducto: string | null = null;
  sinDatos = false;
  monedaSimbolo = '';

  private svg;
  private margin = { top: 20, right: 30, bottom: 50, left: 150 }; // Más espacio para nombres de productos
  private width: number;
  private height: number;
  private resizeObserver?: ResizeObserver;
  private resizePending = false;

  constructor(
    private spinnerService: NgxSpinnerService,
    private ventaService: VentaService,
    configuracionService: ConfiguracionService
  ) {
    this.monedaSimbolo = configuracionService.snapshot?.SimboloMoneda ?? '';
  }

  ngOnInit(): void {
    this.width = this.chartContainer.nativeElement.offsetWidth - this.margin.left - this.margin.right;
    this.height = 400 - this.margin.top - this.margin.bottom;
    this.observeResize();

    const fechaInicial = formatDate(this.fechaInicial, 'yyyyMMdd', 'en-US');
    const fechaFinal = formatDate(this.fechaFinal, 'yyyyMMdd', 'en-US');
    this.getAnulaciones(fechaInicial, fechaFinal);
  }

  /** Redibuja al cambiar el ancho (columna completa ↔ media). El alto es fijo. */
  private observeResize(): void {
    if (typeof ResizeObserver === 'undefined') { return; }
    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizePending) { return; }
      this.resizePending = true;
      requestAnimationFrame(() => {
        this.resizePending = false;
        this.onResize();
      });
    });
    this.resizeObserver.observe(this.chartContainer.nativeElement);
  }

  private onResize(): void {
    const w = this.chartContainer.nativeElement.clientWidth - this.margin.left - this.margin.right;
    if (w <= 0 || w === this.width) { return; }
    this.width = w;
    if (this.data?.length) { this.createChart(); }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.fechaInicial || changes.fechaFinal || changes.enfoque) {
      if (this.fechaInicial && this.fechaFinal) {
        const fechaInicial = formatDate(this.fechaInicial, 'yyyyMMdd', 'en-US');
        const fechaFinal = formatDate(this.fechaFinal, 'yyyyMMdd', 'en-US');
        this.getAnulaciones(fechaInicial, fechaFinal);
      }
    }
  }

  private transformData() {
    if (!this.rawData || this.rawData.length === 0) {
      this.data = [];
      return;
    }

    const groupedData = d3.rollups(
      this.rawData,
      v => d3.sum(v, d => d.Cantidad),
      d => d.Producto
    );

    this.data = groupedData
      .map(([Producto, Cantidad]) => ({ Producto, Cantidad }))
      .sort((a, b) => b.Cantidad - a.Cantidad);
  }

  private createChart() {
    if (this.svg) {
      // Limpiar el gráfico existente
      d3.select(this.chartContainer.nativeElement).selectAll('*').remove();
    }

    const productos = this.data.map(d => d.Producto);
    const maxCantidad = Math.ceil(d3.max(this.data, d => d.Cantidad) || 0);

    // Escalas
    const y = d3.scaleBand().domain(productos).range([0, this.height]).padding(0.2);
    const x = d3.scaleLinear().domain([0, maxCantidad]).range([0, this.width]);

    // Crear SVG
    this.svg = d3.select(this.chartContainer.nativeElement)
      .append('svg')
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.height + this.margin.top + this.margin.bottom)
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // Ejes
    this.svg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${this.height})`)
      .call(d3.axisBottom(x).ticks(maxCantidad).tickFormat(d3.format('d')));;

    this.svg.append('g')
      .attr('class', 'chart-grid')
      .call(d3.axisBottom(x).ticks(Math.min(maxCantidad, 6)).tickSize(this.height).tickFormat(() => ''));

    this.svg.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(y));

    // Crear barras
    this.svg.selectAll('.bar')
      .data(this.data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', d => y(d.Producto))
      .attr('width', d => x(d.Cantidad))
      .attr('height', y.bandwidth())
      .attr('rx', 5)
      .attr('fill', d => d.Producto === this.selectedProducto ? '#8f1406' : '#bf360c')
      .attr('opacity', d => !this.selectedProducto || d.Producto === this.selectedProducto ? 1 : 0.38)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        this.onBarClick(d.Producto);
      });

    this.svg.selectAll('.bar-value')
      .data(this.data)
      .enter()
      .append('text')
      .attr('class', 'bar-value')
      .attr('x', d => x(d.Cantidad) + 7)
      .attr('y', d => (y(d.Producto) ?? 0) + y.bandwidth() / 2)
      .attr('dy', '.35em')
      .style('font-size', '11px')
      .style('font-weight', '750')
      .style('fill', '#5f5049')
      .text(d => d.Cantidad);
  }

  onBarClick(producto: string) {
    this.selectedProducto = this.selectedProducto === producto ? null : producto;
    this.createChart();
  }

  limpiarSeleccion(): void {
    this.selectedProducto = null;
    this.createChart();
  }

  async getAnulaciones(fechaInicial: string, fechaFinal: string) {
    try {
      this.spinnerService.show('anulacionesSpinner');
      const data = await this.ventaService.getAnulaciones(fechaInicial, fechaFinal, this.enfoque).toPromise();
      this.rawData = data ?? [];
      this.selectedProducto = null;

      // Transformar y actualizar el gráfico después de cargar los datos
      this.transformData();
      this.sinDatos = !this.data || this.data.length === 0;
      this.createChart();
    } catch (error) {
      console.error('Error al cargar datos:', error);
      this.rawData = [];
      this.data = [];
      this.sinDatos = true;
    } finally {
      this.spinnerService.hide('anulacionesSpinner');
    }
  }

  get filteredData() {
    return this.rawData.filter(item => !this.selectedProducto || item.Producto === this.selectedProducto);
  }

  get totalAnulaciones(): number {
    return this.rawData.reduce((total, item) => total + item.Cantidad, 0);
  }

  get totalImporte(): number {
    return this.rawData.reduce((total, item) => total + item.Importe, 0);
  }

  get totalRegistros(): number {
    return this.rawData.length;
  }
}
