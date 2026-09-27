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
    const outerHeight = 300;
    const esCompacto = outerWidth < 720;
    const centroX = esCompacto ? outerWidth / 2 : Math.min(outerWidth * .3, 300);
    const centroY = outerHeight / 2;
    const radio = Math.min(esCompacto ? outerWidth * .3 : 112, 112);
    const total = d3.sum(this.data, item => item.Total);
    const colores = [
      '#b4230a',
      '#ef6c00',
      '#f6ad2f',
      '#7b8d42',
      '#00897b',
      '#3f6f8f',
      '#775da6',
      '#a04463',
    ];
    const color = d3.scaleOrdinal<string, string>()
      .domain(this.data.map(item => item.Agrupado))
      .range(colores);

    this.svgRoot = d3.select(host).append('svg')
      .attr('viewBox', `0 0 ${outerWidth} ${outerHeight}`)
      .attr('role', 'img')
      .attr('aria-label', 'Distribución de las ventas del periodo seleccionado');
    this.svg = this.svgRoot.append('g')
      .attr('transform', `translate(${centroX},${centroY})`);

    const mostrarTooltip = (event: MouseEvent, item: ventadiariasemanalmensual) => {
      const porcentaje = total > 0 ? (item.Total / total) * 100 : 0;
      this.tooltip.style('opacity', .95)
        .html(`<strong>${item.Agrupado}</strong><br>${this.monedaSimbolo} ${item.Total.toFixed(2)} · ${porcentaje.toFixed(1)}% · ${item.Transacciones ?? 0} ventas`)
        .style('left', `${event.pageX + 8}px`)
        .style('top', `${event.pageY - 36}px`);
    };
    const ocultarTooltip = () => this.tooltip.style('opacity', 0);

    if (total <= 0) {
      this.svg.append('circle')
        .attr('r', radio)
        .attr('fill', '#eee4dc');
      this.svg.append('circle')
        .attr('r', radio * .58)
        .attr('fill', '#fff8f3');
    } else {
      const pie = d3.pie<ventadiariasemanalmensual>()
        .sort(null)
        .value(item => Math.max(item.Total, 0));
      const arco = d3.arc<d3.PieArcDatum<ventadiariasemanalmensual>>()
        .innerRadius(radio * .58)
        .outerRadius(radio);
      const arcoActivo = d3.arc<d3.PieArcDatum<ventadiariasemanalmensual>>()
        .innerRadius(radio * .56)
        .outerRadius(radio + 5);
      const sectores = pie(this.data);

      this.svg.selectAll('.sales-slice')
        .data(sectores)
        .enter()
        .append('path')
        .attr('class', 'sales-slice')
        .attr('d', arco)
        .attr('fill', sector => color(sector.data.Agrupado))
        .attr('stroke', '#fff8f3')
        .attr('stroke-width', 2)
        .on('mouseover', (event: MouseEvent, sector) => {
          d3.select(event.currentTarget as SVGPathElement).attr('d', arcoActivo(sector));
          mostrarTooltip(event, sector.data);
        })
        .on('mouseout', (event: MouseEvent, sector) => {
          d3.select(event.currentTarget as SVGPathElement).attr('d', arco(sector));
          ocultarTooltip();
        });

      this.svg.selectAll('.sales-percentage')
        .data(sectores.filter(sector =>
          ((sector.endAngle - sector.startAngle) / (Math.PI * 2)) >= .07))
        .enter()
        .append('text')
        .attr('class', 'sales-percentage')
        .attr('transform', sector => `translate(${arco.centroid(sector)})`)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 11)
        .attr('font-weight', 700)
        .attr('fill', '#fff')
        .text(sector => `${((sector.data.Total / total) * 100).toFixed(0)}%`);
    }

    this.svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', -5)
      .attr('font-size', 10)
      .attr('font-weight', 700)
      .attr('fill', '#8c6f60')
      .text('VENTA TOTAL');
    this.svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 17)
      .attr('font-size', 16)
      .attr('font-weight', 800)
      .attr('fill', '#7f1d0d')
      .text(`${this.monedaSimbolo} ${d3.format(',.0f')(total)}`);
    this.svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 37)
      .attr('font-size', 10)
      .attr('fill', '#8c6f60')
      .text(`${this.data.length} ${this.data.length === 1 ? 'periodo' : 'periodos'}`);

    if (!esCompacto) {
      const leyenda = this.svgRoot.append('g')
        .attr('transform', `translate(${outerWidth * .55},34)`);
      const filas = leyenda.selectAll('.sales-legend-row')
        .data(this.data.slice(0, 8))
        .enter()
        .append('g')
        .attr('class', 'sales-legend-row')
        .attr('transform', (_, indice) => `translate(0,${indice * 30})`);

      filas.append('rect')
        .attr('width', 10)
        .attr('height', 18)
        .attr('rx', 5)
        .attr('fill', item => color(item.Agrupado));
      filas.append('text')
        .attr('x', 20)
        .attr('y', 8)
        .attr('font-size', 11)
        .attr('font-weight', 700)
        .attr('fill', '#35251f')
        .text(item => item.Agrupado);
      filas.append('text')
        .attr('x', 20)
        .attr('y', 23)
        .attr('font-size', 10)
        .attr('fill', '#8c6f60')
        .text(item => `${this.monedaSimbolo} ${d3.format(',.2f')(item.Total)} · ${total > 0 ? ((item.Total / total) * 100).toFixed(1) : '0.0'}%`);

      if (this.data.length > 8) {
        leyenda.append('text')
          .attr('x', 20)
          .attr('y', 8 * 30 + 5)
          .attr('font-size', 10)
          .attr('font-weight', 700)
          .attr('fill', '#a33a1c')
          .text(`+ ${this.data.length - 8} periodos en la tarta`);
      }
    }
  }
}
