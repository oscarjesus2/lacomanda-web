import { Component, OnInit, ElementRef, ViewChild, Input, OnChanges, SimpleChanges } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';
import * as d3 from 'd3';
import Swal from 'sweetalert2';
import { VentaService } from 'src/app/services/venta.services';
import { ventadiariasemanalmensual } from 'src/app/models/ventadiariasemanalmensual.models';
import { formatDate } from '@angular/common';
import { StorageService } from 'src/app/services/storage.services';

@Component({
  selector: 'app-popularidad-platos',
  templateUrl: './popularidad-platos.component.html',
  styleUrls: ['./popularidad-platos.component.css']
})
export class PopularidadPlatosComponent implements OnInit, OnChanges {
  @ViewChild('chart', { static: true }) private chartContainer: ElementRef;
  @Input() fechaInicial: Date;
  @Input() fechaFinal: Date;
  private svg: any;
  private margin = { top: 20, right: 20, bottom: 30, left: 90 };
  private width: number;
  private height: number;
  private tooltip: any;
  reportType: number=1;
  constructor(private spinnerService: NgxSpinnerService, private ventaService: VentaService, private storageService: StorageService) { }

  ngOnInit(): void {
    try {
          // Calcula el ancho y alto del gráfico
    this.width = this.chartContainer.nativeElement.offsetWidth - this.margin.left - this.margin.right;
    this.height = 300 - this.margin.top - this.margin.bottom;

    this.createSvg();
    this.tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background-color', 'white')
      .style('border', 'solid')
      .style('border-width', '1px')
      .style('border-radius', '5px')
      .style('padding', '10px');

      var fechaInicial = formatDate(this.fechaInicial, 'yyyyMMdd', 'en-US')
      var fechaFinal = formatDate(this.fechaFinal, 'yyyyMMdd', 'en-US')
      this.getProductosMasVendidos(1, fechaInicial, fechaFinal); // Inicializar con datos Top 1
    } catch (error) {
        this.storageService.logout();
    }

  }

  ngOnChanges(changes: SimpleChanges): void {
    // Detectar cambios en las fechas y actualizar el gráfico
    if (changes.fechaInicial || changes.fechaFinal) {
      if (this.fechaInicial && this.fechaFinal) {
        
      var fechaInicial = formatDate(this.fechaInicial, 'yyyyMMdd', 'en-US')
      var fechaFinal = formatDate(this.fechaFinal, 'yyyyMMdd', 'en-US')
      this.getProductosMasVendidos(this.reportType, fechaInicial, fechaFinal); // Inicializar con datos Top 1
      }
    }
  }


  async getProductosMasVendidos(top: number, fechaInicial: string, fechaFinal: string) {

      const data = await this.ventaService.getProductosMasVendidos(top, fechaInicial, fechaFinal).toPromise();

      // Ordenar datos por cantidad de manera descendente
      data.sort((a, b) => b.Cantidad - a.Cantidad);

      this.updateChart(data);

  }

  onReportTypeChange(event: any): void {
     this.reportType = +event.target.value;
    var fechaInicial = formatDate(this.fechaInicial, 'yyyyMMdd', 'en-US')
    var fechaFinal = formatDate(this.fechaFinal, 'yyyyMMdd', 'en-US')
    this.getProductosMasVendidos(this.reportType, fechaInicial, fechaFinal);
  }

  private createSvg(): void {
    this.svg = d3.select(this.chartContainer.nativeElement)
      .append('svg')
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.height + this.margin.top + this.margin.bottom)
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    this.svg.append('g')
      .attr('class', 'x-axis');

    this.svg.append('g')
      .attr('class', 'y-axis');
  }

  private updateChart(data: any[]): void {
    const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.Cantidad) || 100])
      .range([0, this.width]);

    const y = d3.scaleBand()
      .domain(data.map(d => d.Producto))
      .range([0, this.height])
      .padding(0.1);

    // Actualizar ejes X e Y
    this.svg.select('.x-axis')
      .attr('transform', `translate(0,${this.height})`)
      .call(d3.axisBottom(x));

    this.svg.select('.y-axis')
      .call(d3.axisLeft(y));
    // Seleccionar todas las barras actuales y unirlas con los nuevos datos
    const bars = this.svg.selectAll('.bar')
      .data(data);

    // Eliminar barras que no estén en los nuevos datos
    bars.exit().remove();

    // Actualizar barras existentes
    bars.attr('class', 'bar')
      .transition()
      .duration(300)
      .attr('y', d => y(d.Producto))
      .attr('width', d => x(d.Cantidad))
      .attr('height', y.bandwidth())
      .attr('fill', 'steelblue');

    // Agregar nuevas barras
    bars.enter().append('rect')
      .attr('class', 'bar')
      .attr('y', d => y(d.Producto))
      .attr('width', d => x(d.Cantidad))
      .attr('height', y.bandwidth())
      .attr('fill', 'steelblue')
      .on('mouseover', (event, d) => {
        this.tooltip.transition()
          .duration(200)
          .style('opacity', .9);
        this.tooltip.html(`Total Venta S/. ${d.Total}`)
          .style('left', `${event.pageX}px`)
          .style('top', `${event.pageY - 28}px`);
      })
      .on('mouseout', () => {
        this.tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });
  }
}
