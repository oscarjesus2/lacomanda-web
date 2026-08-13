import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import * as d3 from 'd3';
import { Subscription } from 'rxjs';
import { EvolucionMargenDashboard } from 'src/app/models/dashboard-ejecutivo.models';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { DashboardReportesService } from 'src/app/services/dashboard-reportes.service';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';

@Component({
  selector: 'app-evolucion-margen',
  templateUrl: './evolucion-margen.component.html'
})
export class EvolucionMargenComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() fechaInicial = '';
  @Input() fechaFinal = '';
  @ViewChild('chart', { static: true }) chartContainer: ElementRef<HTMLDivElement>;

  data?: EvolucionMargenDashboard;
  loading = false;
  error = false;
  simboloMoneda = '';
  private viewReady = false;
  private request?: Subscription;
  private resizeObserver?: ResizeObserver;

  constructor(
    private readonly reportesService: DashboardReportesService,
    configuracionService: ConfiguracionService,
    private readonly textos: TenantTextCatalogService
  ) {
    this.simboloMoneda = configuracionService.snapshot?.SimboloMoneda ?? '';
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.resizeObserver = new ResizeObserver(() => this.dibujar());
    this.resizeObserver.observe(this.chartContainer.nativeElement);
    this.cargar();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.viewReady && (changes.fechaInicial || changes.fechaFinal)) this.cargar();
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.resizeObserver?.disconnect();
  }

  private cargar(): void {
    if (!this.fechaInicial || !this.fechaFinal) return;
    this.request?.unsubscribe();
    this.loading = true;
    this.error = false;
    this.request = this.reportesService
      .obtenerEvolucionMargen(this.fechaInicial, this.fechaFinal)
      .subscribe({
        next: data => {
          this.data = data;
          this.loading = false;
          queueMicrotask(() => this.dibujar());
        },
        error: () => {
          this.data = undefined;
          this.error = true;
          this.loading = false;
          this.dibujar();
        }
      });
  }

  private dibujar(): void {
    const host = this.chartContainer?.nativeElement;
    if (!host) return;
    d3.select(host).selectAll('*').remove();
    const puntos = this.data?.Puntos ?? [];
    if (!puntos.length || !puntos.some(p => p.VentaAnalizada || p.CostoHistorico)) return;

    const width = Math.max(host.clientWidth, 320);
    const height = 285;
    const margin = { top: 18, right: 54, bottom: 38, left: 58 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const svg = d3.select(host).append('svg').attr('viewBox', `0 0 ${width} ${height}`);
    const group = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const x = d3.scaleBand<string>()
      .domain(puntos.map(p => p.Fecha)).range([0, innerWidth]).padding(0.24);
    const maxImporte = d3.max(puntos, p => Math.max(p.VentaAnalizada, p.CostoHistorico)) ?? 0;
    const y = d3.scaleLinear().domain([0, maxImporte * 1.12]).nice().range([innerHeight, 0]);
    const maxMargen = Math.max(100, d3.max(puntos, p => Math.abs(p.MargenPorcentaje)) ?? 0);
    const yPorcentaje = d3.scaleLinear().domain([-maxMargen, maxMargen]).nice().range([innerHeight, 0]);
    group.append('g').attr('class', 'executive-chart__grid')
      .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(() => ''));
    group.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(v => d3.format('~s')(Number(v))));
    group.append('g').attr('transform', `translate(${innerWidth},0)`)
      .call(d3.axisRight(yPorcentaje).ticks(5).tickFormat(v => `${v}%`));
    group.append('g').attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickValues(x.domain().filter((_, i) =>
        i % Math.max(1, Math.ceil(puntos.length / 7)) === 0)).tickFormat(this.formatearFecha));
    group.selectAll('.executive-chart__bar-sale').data(puntos).enter().append('rect')
      .attr('class', 'executive-chart__bar executive-chart__bar--sale')
      .attr('x', p => (x(p.Fecha) ?? 0))
      .attr('y', p => y(p.VentaAnalizada))
      .attr('width', Math.max(2, x.bandwidth() * 0.48))
      .attr('height', p => innerHeight - y(p.VentaAnalizada));
    group.selectAll('.executive-chart__bar-cost').data(puntos).enter().append('rect')
      .attr('class', 'executive-chart__bar executive-chart__bar--cost')
      .attr('x', p => (x(p.Fecha) ?? 0) + x.bandwidth() * 0.5)
      .attr('y', p => y(p.CostoHistorico))
      .attr('width', Math.max(2, x.bandwidth() * 0.48))
      .attr('height', p => innerHeight - y(p.CostoHistorico));
    const linea = d3.line<typeof puntos[number]>()
      .x(p => (x(p.Fecha) ?? 0) + x.bandwidth() / 2)
      .y(p => yPorcentaje(p.MargenPorcentaje)).curve(d3.curveMonotoneX);
    group.append('path').datum(puntos)
      .attr('class', 'executive-chart__line executive-chart__line--margin')
      .attr('d', linea);
    const tooltip = d3.select(host).append('div').attr('class', 'executive-tooltip');
    group.selectAll('.executive-chart__margin-dot').data(puntos).enter().append('circle')
      .attr('class', 'executive-chart__margin-dot')
      .attr('cx', p => (x(p.Fecha) ?? 0) + x.bandwidth() / 2)
      .attr('cy', p => yPorcentaje(p.MargenPorcentaje)).attr('r', 4)
      .on('mouseenter', (event, p) => tooltip.classed('is-visible', true)
        .html(`<strong>${this.formatearFecha(p.Fecha)}</strong><br>${this.textos.get('analyzedSales')}: ${this.simboloMoneda} ${p.VentaAnalizada.toFixed(2)}<br>${this.textos.get('historicalCost')}: ${this.simboloMoneda} ${p.CostoHistorico.toFixed(2)}<br>${this.textos.get('grossMargin')}: ${p.MargenPorcentaje.toFixed(1)}%`))
      .on('mousemove', event => tooltip.style('left', `${event.offsetX + 12}px`).style('top', `${event.offsetY - 18}px`))
      .on('mouseleave', () => tooltip.classed('is-visible', false));
  }

  private formatearFecha(fecha: string): string {
    const [, month, day] = fecha.split('-').map(Number);
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`;
  }
}
