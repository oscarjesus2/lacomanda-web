import { Component, OnInit, ElementRef, ViewChild, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';
import * as d3 from 'd3';
import Swal from 'sweetalert2';
import { VentaService } from '../../../services/venta.service';
import { ventadiariasemanalmensual } from 'src/app/models/ventadiariasemanalmensual.models';
import { formatDate } from '@angular/common';
import { StorageService } from 'src/app/services/storage.service';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { DashboardEnfoqueFecha } from 'src/app/models/dashboard-filtro.models';

@Component({
  selector: 'app-ventas-diarias',
  templateUrl: './ventas-diarias.component.html',
  styleUrls: ['./ventas-diarias.component.css']
})
export class VentasDiariasComponent implements OnInit, OnChanges, OnDestroy  {
  @ViewChild('chart', { static: true })

  private chartContainer: ElementRef;
  @Input() fechaInicial: Date;
  @Input() fechaFinal: Date;
  @Input() enfoque: DashboardEnfoqueFecha = 'FechaVenta';
  totalVenta: number;
  sinDatos = false;
  monedaSimbolo = '';
  reportType: string = 'diarias';
  private data: ventadiariasemanalmensual[];
  private svgRoot;
  private svg;
  private width: number;
  private height: number;
  private radius: number;
  private resizeObserver?: ResizeObserver;
  private resizePending = false;

  private color;
  private tooltip;

  constructor(
    private spinnerService: NgxSpinnerService,
    private ventaService: VentaService,
    private storageService: StorageService,
    private configuracionService: ConfiguracionService,) { }

  ngOnInit(): void {
    try {
      this.width = this.chartContainer.nativeElement.offsetWidth;
      this.height = this.chartContainer.nativeElement.offsetHeight;
      this.radius = Math.min(this.width, this.height) / 2;
  
      this.initSvg();
      this.observeResize();
      this.configuracionService.get().subscribe(cfg => this.monedaSimbolo = cfg?.SimboloMoneda ?? '');
      if (this.fechaInicial && this.fechaFinal) {
        const fechaInicialStr = formatDate(this.fechaInicial, 'yyyyMMdd', 'en-US');
        const fechaFinalStr = formatDate(this.fechaFinal, 'yyyyMMdd', 'en-US');
        this.getVentaDiariasSemanalMensual(1, fechaInicialStr, fechaFinalStr); // Initialize with daily data
      }
    } catch (error) {
      this.storageService.logout();
    }

  }
  ngOnChanges(changes: SimpleChanges): void {
    // Detectar cambios en las fechas y actualizar el gráfico
    if (changes.fechaInicial || changes.fechaFinal || changes.enfoque) {
      if (this.fechaInicial && this.fechaFinal) {
        var fechaInicial = formatDate(this.fechaInicial, 'yyyyMMdd', 'en-US')
        var fechaFinal = formatDate(this.fechaFinal, 'yyyyMMdd', 'en-US')
    
        if (this.reportType === 'diarias') {
          this.getVentaDiariasSemanalMensual(1, fechaInicial, fechaFinal);
        } else if (this.reportType === 'semanales') {
          this.getVentaDiariasSemanalMensual(2, fechaInicial, fechaFinal);
        } else if (this.reportType === 'mensuales') {
          this.getVentaDiariasSemanalMensual(3, fechaInicial, fechaFinal);
        }
      }
    }
  }
  private initSvg() {
    this.color = d3.scaleOrdinal(d3.schemeCategory10);

    this.svgRoot = d3.select(this.chartContainer.nativeElement)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height);

    this.svg = this.svgRoot
      .append('g')
      .attr('transform', `translate(${this.width / 2},${this.height / 2})`);

      this.tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('text-align', 'center')
      .style('width', 'auto')
      .style('height', 'auto')
      .style('padding', '8px')
      .style('font', '12px sans-serif')
      .style('background', 'lightsteelblue')
      .style('border', '0px')
      .style('border-radius', '8px')
      .style('pointer-events', 'none')
      .style('opacity', 0);
  }

  /** Redibuja el gráfico cuando el contenedor cambia de tamaño
   *  (p. ej. al abrir/cerrar otro panel y pasar de columna completa a media). */
  private observeResize(): void {
    if (typeof ResizeObserver === 'undefined') { return; }
    this.resizeObserver = new ResizeObserver(() => {
      // requestAnimationFrame evita el warning "ResizeObserver loop" y agrupa cambios.
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
    const w = this.chartContainer.nativeElement.clientWidth;
    // Solo reaccionamos al ancho (lo fija la columna). La altura se mantiene
    // estable: escribir la altura desde el contenido creaba un bucle infinito.
    if (!w || w === this.width) { return; }

    this.width = w;
    this.radius = Math.min(this.width, this.height) / 2;

    this.svgRoot.attr('width', this.width).attr('height', this.height);
    this.svg.attr('transform', `translate(${this.width / 2},${this.height / 2})`);

    if (this.data) { this.updateChart(); }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.tooltip) { this.tooltip.remove(); }
  }

  async getVentaDiariasSemanalMensual(tipo: number, fechaInicial: string, fechaFinal: string) {
    this.spinnerService.show('ventaDiariaSpinner');
      const data = await this.ventaService.getVentaDiariasSemanalMensual(tipo, fechaInicial, fechaFinal, this.enfoque).toPromise();
      this.data = data;
      this.sinDatos = !this.data || this.data.length === 0;
      this.totalVenta = this.data.reduce((acc, venta) => acc + venta.Total, 0);
      this.spinnerService.hide('ventaDiariaSpinner');
      this.updateChart();
  }

  onReportTypeChange(event: any): void {
    this.reportType = event.target.value;

    if (this.fechaInicial && this.fechaFinal) {
      var fechaInicial = formatDate(this.fechaInicial, 'yyyyMMdd', 'en-US')
      var fechaFinal = formatDate(this.fechaFinal, 'yyyyMMdd', 'en-US')
      if (this.reportType === 'diarias') {
        this.getVentaDiariasSemanalMensual(1, fechaInicial, fechaFinal);
      } else if (this.reportType === 'semanales') {
        this.getVentaDiariasSemanalMensual(2, fechaInicial, fechaFinal);
      } else if (this.reportType === 'mensuales') {
        this.getVentaDiariasSemanalMensual(3, fechaInicial, fechaFinal);
      }
    }

  }

  private updateChart() {
    const host = this.chartContainer.nativeElement;
    d3.select(host).selectAll('svg').remove();
    if (!this.data?.length) { return; }

    const outerWidth = Math.max(host.clientWidth, 320);
    const outerHeight = 280;
    const margin = { top: 18, right: 20, bottom: 44, left: 58 };
    const width = outerWidth - margin.left - margin.right;
    const height = outerHeight - margin.top - margin.bottom;
    this.svgRoot = d3.select(host).append('svg')
      .attr('viewBox', `0 0 ${outerWidth} ${outerHeight}`)
      .attr('role', 'img');
    this.svg = this.svgRoot.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint<string>()
      .domain(this.data.map(item => item.Agrupado))
      .range([0, width])
      .padding(.35);
    const maximo = d3.max(this.data, item => item.Total) ?? 0;
    const y = d3.scaleLinear()
      .domain([0, maximo * 1.12 || 1])
      .nice()
      .range([height, 0]);

    this.svg.append('g')
      .attr('class', 'chart-grid')
      .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(() => ''));
    this.svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x));
    this.svg.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(value => d3.format('~s')(Number(value))));

    const area = d3.area<ventadiariasemanalmensual>()
      .x(item => x(item.Agrupado) ?? 0)
      .y0(height)
      .y1(item => y(item.Total))
      .curve(d3.curveMonotoneX);
    const line = d3.line<ventadiariasemanalmensual>()
      .x(item => x(item.Agrupado) ?? 0)
      .y(item => y(item.Total))
      .curve(d3.curveMonotoneX);

    this.svg.append('path').datum(this.data)
      .attr('d', area)
      .attr('fill', 'rgba(191, 54, 12, .11)');
    this.svg.append('path').datum(this.data)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', '#bf360c')
      .attr('stroke-width', 2.6);
    this.svg.selectAll('.sales-dot').data(this.data).enter().append('circle')
      .attr('class', 'sales-dot')
      .attr('cx', item => x(item.Agrupado) ?? 0)
      .attr('cy', item => y(item.Total))
      .attr('r', 4.5)
      .attr('fill', '#bf360c')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .on('mouseover', (event: MouseEvent, item) => {
        this.tooltip.style('opacity', .95)
          .html(`<strong>${item.Agrupado}</strong><br>${this.monedaSimbolo} ${item.Total.toFixed(2)} · ${item.Transacciones ?? 0} ventas`)
          .style('left', `${event.pageX + 8}px`)
          .style('top', `${event.pageY - 36}px`);
      })
      .on('mouseout', () => this.tooltip.style('opacity', 0));
  }
}
