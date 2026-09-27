import { Component, OnInit, ElementRef, ViewChild, Input, SimpleChanges, OnChanges, OnDestroy } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';
import * as d3 from 'd3';
import { VentaService } from 'src/app/services/venta.service';
import { formatDate } from '@angular/common';
import { StorageService } from 'src/app/services/storage.service';
import { DashboardEnfoqueFecha } from 'src/app/models/dashboard-filtro.models';

@Component({
  selector: 'app-horas-pico',
  templateUrl: './horas-pico.component.html',
  styleUrls: ['./horas-pico.component.css']
})
export class HorasPicoComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('chart', { static: true }) private chartContainer: ElementRef;
  @Input() fechaInicial: Date;
  @Input() fechaFinal: Date;
  @Input() enfoque: DashboardEnfoqueFecha = 'FechaVenta';
  horaPico: string;
  private svgRoot: any;
  private svg: any;
  private margin = { top: 20, right: 20, bottom: 30, left: 70 };
  private width: number;
  private height: number;
  private lastData: any[] = [];
  private resizeObserver?: ResizeObserver;
  private resizePending = false;
  sinDatos = false;
  loading: boolean = true;
  reportType = 1;

  constructor(private spinnerService: NgxSpinnerService, private ventaService: VentaService, private storageService: StorageService) { }

  ngOnInit(): void {
    try {
      this.width = 600 - this.margin.left - this.margin.right;
      this.height = 400 - this.margin.top - this.margin.bottom;
      this.createSvg();
      this.observeResize();

      var fechaInicial = formatDate(this.fechaInicial, 'yyyyMMdd', 'en-US')
      var fechaFinal = formatDate(this.fechaFinal, 'yyyyMMdd', 'en-US')
      this.getVentasHoraPico(this.reportType, fechaInicial, fechaFinal);
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
        this.getVentasHoraPico(this.reportType, fechaInicial, fechaFinal);
      }
    }
  }


  async getVentasHoraPico(tipo: number, fechaInicial: string, fechaFinal: string) {
    this.spinnerService.show('horasPicoSpinner');
    this.loading = true;
    let maxValor = Number.MIN_SAFE_INTEGER;
    const data = await this.ventaService.getVentasHoraPico(tipo, fechaInicial, fechaFinal, this.enfoque).toPromise();
    data.forEach((elemento) => {
      if (elemento.Total > maxValor) {
        maxValor = elemento.Total;
        this.horaPico = elemento.Agrupado;
      }
    });
    this.loading = false;
    this.sinDatos = !data || data.length === 0;
    this.spinnerService.hide('horasPicoSpinner');
    this.updateChart(data);

  }

  onReportTypeChange(event: any): void {
    this.reportType = +event.target.value;
    var fechaInicial = formatDate(this.fechaInicial, 'yyyyMMdd', 'en-US')
    var fechaFinal = formatDate(this.fechaFinal, 'yyyyMMdd', 'en-US')
    this.getVentasHoraPico(this.reportType, fechaInicial, fechaFinal);
  }


  private createSvg(): void {
    // Obtener el tamaño del contenedor
    const element = this.chartContainer.nativeElement;
    this.width = element.offsetWidth - this.margin.left - this.margin.right;
    this.height = element.offsetHeight - this.margin.top - this.margin.bottom;

    this.svgRoot = d3.select(element)
      .append('svg')
      .attr('width', element.offsetWidth)
      .attr('height', element.offsetHeight);

    this.svg = this.svgRoot
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
  }

  /** Redibuja al cambiar el ancho (columna completa ↔ media). El alto se mantiene. */
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
    const el = this.chartContainer.nativeElement;
    const w = el.clientWidth - this.margin.left - this.margin.right;
    if (w <= 0 || w === this.width) { return; }
    this.width = w;
    this.svgRoot.attr('width', el.clientWidth);
    if (this.lastData?.length) { this.updateChart(this.lastData); }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }


  private updateChart(data: any[]): void {
    this.lastData = data;
    // Limpiar gráfico existente antes de actualizar
    this.svg.selectAll('*').remove();

    const x = d3.scaleBand()
      .domain(data.map(d => d.Agrupado))
      .range([0, this.width])
      .padding(0.22);

    const y = d3.scaleLinear()
      .domain([0, (d3.max(data, d => d.Total) ?? 0) * 1.12 || 1])
      .nice()
      .range([this.height, 0]);

    const yAxisFormat = d3.format('~s');

    const yAxis = d3.axisLeft(y)
      .tickFormat(d => yAxisFormat(Number(d)));

    const line = d3.line<any>()
      .x(d => x(d.Agrupado) + x.bandwidth() / 2)
      .y(d => y(d.Total))
      .curve(d3.curveMonotoneX);

    const area = d3.area<any>()
      .x(d => x(d.Agrupado) + x.bandwidth() / 2)
      .y0(this.height)
      .y1(d => y(d.Total))
      .curve(d3.curveMonotoneX);

    this.svg.append('g')
      .attr('class', 'chart-grid')
      .call(d3.axisLeft(y).ticks(5).tickSize(-this.width).tickFormat(() => ''));

    this.svg.append('path')
      .datum(data)
      .attr('fill', 'rgba(0, 121, 107, .12)')
      .attr('d', area);

    this.svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#00796b')
      .attr('stroke-width', 2.6)
      .attr('d', line);

    this.svg.selectAll('.peak-dot').data(data).enter().append('circle')
      .attr('class', 'peak-dot')
      .attr('cx', d => x(d.Agrupado) + x.bandwidth() / 2)
      .attr('cy', d => y(d.Total))
      .attr('r', 4)
      .attr('fill', '#00796b')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    this.svg.append('g')
      .attr('class', 'axis axis-x')
      .attr('transform', `translate(0,${this.height})`)
      .call(d3.axisBottom(x));

    this.svg.append('g')
      .attr('class', 'axis axis-y')
      .call(yAxis);

    // Estilo adicional para los ticks y el texto del eje Y
    this.svg.selectAll('.axis-y text')
      .style('font-size', '10px');

    this.svg.selectAll('.axis-y line')
      .attr('stroke', '#ccc')
      .attr('stroke-width', '1px')
      .attr('shape-rendering', 'crispEdges');
  }



}
