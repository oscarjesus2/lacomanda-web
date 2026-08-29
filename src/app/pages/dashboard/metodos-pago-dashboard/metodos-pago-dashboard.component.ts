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
import { MetodoPagoDashboardItem, MetodosPagoDashboard } from 'src/app/models/dashboard-ejecutivo.models';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { DashboardReportesService } from 'src/app/services/dashboard-reportes.service';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';

@Component({
  selector: 'app-metodos-pago-dashboard',
  templateUrl: './metodos-pago-dashboard.component.html'
})
export class MetodosPagoDashboardComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() fechaInicial = '';
  @Input() fechaFinal = '';
  @ViewChild('chart', { static: true }) chartContainer: ElementRef<HTMLDivElement>;

  data?: MetodosPagoDashboard;
  loading = false;
  error = false;
  simboloMoneda = '';
  readonly colores = ['#bf360c', '#f57c00', '#00796b', '#5e35b1', '#0277bd', '#6d4c41'];
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

  colorMetodo(index: number): string {
    return this.colores[index % this.colores.length];
  }

  private cargar(): void {
    if (!this.fechaInicial || !this.fechaFinal) return;
    this.request?.unsubscribe();
    this.loading = true;
    this.error = false;
    this.request = this.reportesService
      .obtenerMetodosPago(this.fechaInicial, this.fechaFinal)
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
    const metodos = this.data?.Metodos ?? [];
    if (!metodos.length || !metodos.some(item => item.NetoMonedaBase > 0)) return;

    const size = Math.min(Math.max(host.clientWidth, 240), 330);
    const radius = size / 2;
    const svg = d3.select(host).append('svg').attr('viewBox', `0 0 ${size} ${size}`);
    const group = svg.append('g').attr('transform', `translate(${radius},${radius})`);
    const pie = d3.pie<MetodoPagoDashboardItem>()
      .sort(null).value(item => Math.max(0, item.NetoMonedaBase));
    const arc = d3.arc<d3.PieArcDatum<MetodoPagoDashboardItem>>()
      .innerRadius(radius * 0.57).outerRadius(radius * 0.88).cornerRadius(5).padAngle(0.018);
    const tooltip = d3.select(host).append('div').attr('class', 'executive-tooltip');
    group.selectAll('path').data(pie(metodos)).enter().append('path')
      .attr('d', arc)
      .attr('fill', (_, index) => this.colorMetodo(index))
      .attr('class', 'executive-chart__donut-segment')
      .on('mouseenter', (event, item) => tooltip.classed('is-visible', true)
        .html(`<strong>${item.data.TipoPago}</strong><br>${this.simboloMoneda} ${item.data.NetoMonedaBase.toFixed(2)} · ${item.data.Porcentaje.toFixed(1)}%`))
      .on('mousemove', event => tooltip.style('left', `${event.offsetX + 12}px`).style('top', `${event.offsetY - 18}px`))
      .on('mouseleave', () => tooltip.classed('is-visible', false));
    group.append('text').attr('class', 'executive-chart__donut-caption')
      .attr('text-anchor', 'middle').attr('y', -8).text(this.textos.get('netCollected').toUpperCase());
    group.append('text').attr('class', 'executive-chart__donut-total')
      .attr('text-anchor', 'middle').attr('y', 18)
      .text(`${this.simboloMoneda} ${this.formatearCompacto(this.data?.TotalNetoMonedaBase ?? 0)}`);
    group.append('text').attr('class', 'executive-chart__donut-caption')
      .attr('text-anchor', 'middle').attr('y', 39)
      .text(`${this.data?.CantidadPagos ?? 0} ${this.textos.get('payments')}`);
  }

  private formatearCompacto(valor: number): string {
    return Intl.NumberFormat('es', { notation: 'compact', maximumFractionDigits: 1 }).format(valor);
  }
}
