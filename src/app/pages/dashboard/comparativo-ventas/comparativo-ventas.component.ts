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
import { ComparativoVentasDashboard } from 'src/app/models/dashboard-ejecutivo.models';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { DashboardReportesService } from 'src/app/services/dashboard-reportes.service';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';
import { DashboardEnfoqueFecha } from 'src/app/models/dashboard-filtro.models';

@Component({
  selector: 'app-comparativo-ventas',
  templateUrl: './comparativo-ventas.component.html'
})
export class ComparativoVentasComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() fechaInicial = '';
  @Input() fechaFinal = '';
  @Input() enfoque: DashboardEnfoqueFecha = 'FechaVenta';
  @ViewChild('chart', { static: true }) chartContainer: ElementRef<HTMLDivElement>;

  data?: ComparativoVentasDashboard;
  loading = false;
  error = false;
  simboloMoneda = '';
  private viewReady = false;
  private request?: Subscription;
  private resizeObserver?: ResizeObserver;

  constructor(
    private readonly reportesService: DashboardReportesService,
    private readonly configuracionService: ConfiguracionService,
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
    if (this.viewReady && (changes.fechaInicial || changes.fechaFinal || changes.enfoque)) {
      this.cargar();
    }
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.resizeObserver?.disconnect();
  }

  variacionClase(valor: number | null): string {
    if (valor == null || valor === 0) return 'is-neutral';
    return valor > 0 ? 'is-positive' : 'is-negative';
  }

  private cargar(): void {
    if (!this.fechaInicial || !this.fechaFinal) return;
    this.request?.unsubscribe();
    this.loading = true;
    this.error = false;
    this.request = this.reportesService
      .obtenerComparativoVentas(this.fechaInicial, this.fechaFinal, this.enfoque)
      .subscribe({
        next: data => {
          this.data = data;
          this.loading = false;
          queueMicrotask(() => this.dibujar());
        },
        error: () => {
          this.error = true;
          this.loading = false;
          this.data = undefined;
          this.dibujar();
        }
      });
  }

  private dibujar(): void {
    const host = this.chartContainer?.nativeElement;
    if (!host) return;
    d3.select(host).selectAll('*').remove();
    const puntos = this.data?.Puntos ?? [];
    if (!puntos.length || !puntos.some(p => p.VentaActual || p.VentaAnterior)) return;

    const width = Math.max(host.clientWidth, 320);
    const height = 270;
    const margin = { top: 18, right: 20, bottom: 38, left: 58 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const svg = d3.select(host).append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img');
    const group = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    const max = d3.max(puntos, p => Math.max(p.VentaActual, p.VentaAnterior)) ?? 0;
    const y = d3.scaleLinear().domain([0, max * 1.12 || 1]).nice().range([innerHeight, 0]);
    group.append('g').attr('class', 'executive-chart__grid')
      .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(() => ''));
    group.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(value =>
      d3.format('~s')(Number(value))));
    const tooltip = d3.select(host).append('div').attr('class', 'executive-tooltip');

    if (puntos.length === 1) {
      const punto = puntos[0];
      const columnas = [
        {
          clave: 'actual',
          etiqueta: this.textos.get('currentPeriod'),
          fecha: punto.FechaActual,
          valor: punto.VentaActual,
        },
        {
          clave: 'anterior',
          etiqueta: this.textos.get('previousPeriod'),
          fecha: punto.FechaAnterior,
          valor: punto.VentaAnterior,
        },
      ];
      const anchoGrupo = Math.min(innerWidth * .56, 380);
      const inicioGrupo = (innerWidth - anchoGrupo) / 2;
      const xColumnas = d3.scaleBand<string>()
        .domain(columnas.map(columna => columna.clave))
        .range([inicioGrupo, inicioGrupo + anchoGrupo])
        .padding(.32);

      group.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xColumnas).tickFormat(clave => {
          const columna = columnas.find(item => item.clave === clave);
          return columna
            ? `${columna.etiqueta} · ${this.formatearFecha(columna.fecha)}`
            : '';
        }));

      group.selectAll('.executive-chart__comparison-bar')
        .data(columnas)
        .enter()
        .append('rect')
        .attr('class', columna =>
          `executive-chart__comparison-bar ${columna.clave === 'actual'
            ? 'is-current'
            : 'is-previous'}`)
        .attr('x', columna => xColumnas(columna.clave) ?? 0)
        .attr('y', columna => y(columna.valor))
        .attr('width', xColumnas.bandwidth())
        .attr('height', columna => Math.max(innerHeight - y(columna.valor), 2))
        .on('mouseenter', (event, columna) => tooltip
          .classed('is-visible', true)
          .html(`<strong>${columna.etiqueta}</strong><br>${this.formatearFecha(columna.fecha)}<br>${this.simboloMoneda} ${columna.valor.toFixed(2)}`))
        .on('mousemove', event => tooltip
          .style('left', `${event.offsetX + 12}px`)
          .style('top', `${event.offsetY - 18}px`))
        .on('mouseleave', () => tooltip.classed('is-visible', false));

      group.selectAll('.executive-chart__comparison-value')
        .data(columnas)
        .enter()
        .append('text')
        .attr('class', 'executive-chart__comparison-value')
        .attr('x', columna =>
          (xColumnas(columna.clave) ?? 0) + (xColumnas.bandwidth() / 2))
        .attr('y', columna => Math.max(y(columna.valor) - 9, 12))
        .attr('text-anchor', 'middle')
        .text(columna => `${this.simboloMoneda} ${d3.format(',.2f')(columna.valor)}`);
      return;
    }

    const x = d3.scaleLinear()
      .domain(d3.extent(puntos, p => p.Indice) as [number, number])
      .range([0, innerWidth]);
    group.append('g').attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(Math.min(puntos.length, 7)).tickFormat(index => {
        const punto = puntos[Math.max(0, Math.min(puntos.length - 1, Math.round(Number(index)) - 1))];
        return punto ? this.formatearFecha(punto.FechaActual) : '';
      }));
    const area = d3.area<typeof puntos[number]>()
      .x(p => x(p.Indice)).y0(innerHeight).y1(p => y(p.VentaActual)).curve(d3.curveMonotoneX);
    group.append('path').datum(puntos)
      .attr('class', 'executive-chart__area').attr('d', area);
    const lineaActual = d3.line<typeof puntos[number]>()
      .x(p => x(p.Indice)).y(p => y(p.VentaActual)).curve(d3.curveMonotoneX);
    const lineaAnterior = d3.line<typeof puntos[number]>()
      .x(p => x(p.Indice)).y(p => y(p.VentaAnterior)).curve(d3.curveMonotoneX);
    group.append('path').datum(puntos)
      .attr('class', 'executive-chart__line executive-chart__line--primary')
      .attr('d', lineaActual);
    group.append('path').datum(puntos)
      .attr('class', 'executive-chart__line executive-chart__line--previous')
      .attr('d', lineaAnterior);
    group.selectAll('.executive-chart__hit').data(puntos).enter().append('circle')
      .attr('class', 'executive-chart__hit')
      .attr('cx', p => x(p.Indice)).attr('cy', p => y(p.VentaActual)).attr('r', 5)
      .on('mouseenter', (event, p) => tooltip
        .classed('is-visible', true)
        .html(`<strong>${this.formatearFecha(p.FechaActual)}</strong><br>${this.simboloMoneda} ${p.VentaActual.toFixed(2)}<br><span>${this.textos.get('previousPeriod')}: ${this.simboloMoneda} ${p.VentaAnterior.toFixed(2)}</span>`))
      .on('mousemove', event => tooltip
        .style('left', `${event.offsetX + 12}px`).style('top', `${event.offsetY - 18}px`))
      .on('mouseleave', () => tooltip.classed('is-visible', false));
  }

  private formatearFecha(fecha: string): string {
    const [, month, day] = fecha.split('-').map(Number);
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`;
  }
}
