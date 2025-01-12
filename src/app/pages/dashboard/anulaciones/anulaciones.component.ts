import { formatDate } from '@angular/common';
import { Component, OnInit, ElementRef, ViewChild, Input, SimpleChanges } from '@angular/core';
import * as d3 from 'd3';
import { NgxSpinnerService } from 'ngx-spinner';
import { ventadiariasemanalmensual } from 'src/app/models/ventadiariasemanalmensual.models';
import { StorageService } from 'src/app/services/storage.service';
import { VentaService } from 'src/app/services/venta.service';

@Component({
  selector: 'app-anulaciones',
  templateUrl: './anulaciones.component.html',
  styleUrls: ['./anulaciones.component.css']
})
export class AnulacionesComponent implements OnInit {
  @ViewChild('chart', { static: true }) private chartContainer: ElementRef;
  @Input() fechaInicial: Date;
  @Input() fechaFinal: Date;

  // Datos originales
  private rawData: ventadiariasemanalmensual[] = [];

  // Datos transformados
  data = [];

  selectedProducto: string | null = null;

  private svg;
  private margin = { top: 20, right: 30, bottom: 50, left: 150 }; // Más espacio para nombres de productos
  private width: number;
  private height: number;

  constructor(
    private spinnerService: NgxSpinnerService,
    private ventaService: VentaService,
    private storageService: StorageService
  ) {}

  ngOnInit(): void {
    this.width = this.chartContainer.nativeElement.offsetWidth - this.margin.left - this.margin.right;
    this.height = 400 - this.margin.top - this.margin.bottom;

    const fechaInicial = formatDate(this.fechaInicial, 'yyyyMMdd', 'en-US');
    const fechaFinal = formatDate(this.fechaFinal, 'yyyyMMdd', 'en-US');
    this.getAnulaciones(fechaInicial, fechaFinal);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.fechaInicial || changes.fechaFinal) {
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

    // Agrupar por Producto y sumar cantidades
    const groupedData = d3.rollups(
      this.rawData,
      v => d3.sum(v, d => d.Cantidad), // Sumar las cantidades
      d => d.Producto
    );

    // Convertir el formato agrupado en una estructura plana
    this.data = groupedData.map(([Producto, Cantidad]) => ({ Producto, Cantidad }));

    console.log('Datos transformados:', this.data);
  }

  private createChart() {
    if (this.svg) {
      // Limpiar el gráfico existente
      d3.select(this.chartContainer.nativeElement).selectAll('*').remove();
    }

    const productos = this.data.map(d => d.Producto); // Productos únicos
    const maxCantidad = d3.max(this.data, d => d.Cantidad) || 0;

    // Escalas
    const y = d3.scaleBand().domain(productos).range([0, this.height]).padding(0.2);
    const x = d3.scaleLinear().domain([0, maxCantidad]).range([0, this.width]);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

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
      .call(d3.axisBottom(x));

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
      .attr('fill', d => color(d.Producto))
      .on('click', (event, d) => {
        this.onBarClick(d.Producto);
      });
  }

  onBarClick(producto: string) {
    this.selectedProducto = producto;
  }

  async getAnulaciones(fechaInicial: string, fechaFinal: string) {
    try {
      this.spinnerService.show('anulacionesSpinner');
      const data = await this.ventaService.getAnulaciones(fechaInicial, fechaFinal).toPromise();
      this.rawData = data;

      // Transformar y actualizar el gráfico después de cargar los datos
      this.transformData();
      this.createChart();
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      this.spinnerService.hide('anulacionesSpinner');
    }
  }

  get filteredData() {
    return this.rawData.filter(item => !this.selectedProducto || item.Producto === this.selectedProducto);
  }
}
