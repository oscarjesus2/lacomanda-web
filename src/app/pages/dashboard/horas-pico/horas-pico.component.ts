import { Component, OnInit, ElementRef, ViewChild, Input, SimpleChanges, OnChanges } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';
import * as d3 from 'd3';
import Swal from 'sweetalert2';
import { VentaService } from 'src/app/services/venta.service';
import { ventadiariasemanalmensual } from 'src/app/models/ventadiariasemanalmensual.models';
import { formatDate } from '@angular/common';
import { StorageService } from 'src/app/services/storage.service';

@Component({
  selector: 'app-horas-pico',
  templateUrl: './horas-pico.component.html',
  styleUrls: ['./horas-pico.component.css']
})
export class HorasPicoComponent implements OnInit , OnChanges{
  @ViewChild('chart', { static: true }) private chartContainer: ElementRef;
  @Input() fechaInicial: Date;
  @Input() fechaFinal: Date;
  horaPico: string;
  private svg: any;
  private margin = { top: 20, right: 20, bottom: 30, left: 70 };
  private width: number;
  private height: number;
  constructor(private spinnerService: NgxSpinnerService, private ventaService: VentaService, private storageService:StorageService) { }

  ngOnInit(): void {
    try {
            this.width = 600 - this.margin.left - this.margin.right;
      this.height = 400 - this.margin.top - this.margin.bottom;
      this.createSvg();
      
      var fechaInicial = formatDate(this.fechaInicial, 'yyyyMMdd', 'en-US')
      var fechaFinal = formatDate(this.fechaFinal, 'yyyyMMdd', 'en-US')
      this.getVentasHoraPico(1, fechaInicial, fechaFinal); // Inicializar con datos Tarde
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
      this.getVentasHoraPico(1, fechaInicial, fechaFinal); // Inicializar con datos Tarde
      }
    }
  }


  async getVentasHoraPico(tipo: number, fechaInicial: string, fechaFinal: string) {
 
      let maxValor = Number.MIN_SAFE_INTEGER;
      const data = await this.ventaService.getVentasHoraPico(tipo, fechaInicial, fechaFinal).toPromise();
      data.forEach((elemento) => {
        if (elemento.Total > maxValor) {
          maxValor = elemento.Total;
          this.horaPico = elemento.Agrupado;
        }
      });

    
      this.updateChart(data);

  }

  onReportTypeChange(event: any): void {
    const reportType = +event.target.value;
    var fechaInicial = formatDate(this.fechaInicial, 'yyyyMMdd', 'en-US')
    var fechaFinal = formatDate(this.fechaFinal, 'yyyyMMdd', 'en-US')
    this.getVentasHoraPico(reportType, fechaInicial, fechaFinal);
  }
 
  
  private createSvg(): void {
    // Obtener el tamaño del contenedor
    const element = this.chartContainer.nativeElement;
    this.width = element.offsetWidth - this.margin.left - this.margin.right;
    this.height = element.offsetHeight - this.margin.top - this.margin.bottom;
  
    this.svg = d3.select(element)
      .append('svg')
      .attr('width', element.offsetWidth)
      .attr('height', element.offsetHeight)
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
  }


  private updateChart(data: any[]): void {
    // Limpiar gráfico existente antes de actualizar
    this.svg.selectAll('*').remove();
  
    const x = d3.scaleBand()
      .domain(data.map(d => d.Agrupado))
      .range([0, this.width])
      .padding(0.1);
  
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.Total)])
      .nice()
      .range([this.height, 0]);
  
    const yAxisFormat = d3.format(',.0f'); // Formato para los ticks del eje Y
  
    const yAxis = d3.axisLeft(y)
      .tickFormat(d => `S/.${yAxisFormat(d)}`); // Antepone 'S/.' a cada tick
  
    const line = d3.line<any>()
      .x(d => x(d.Agrupado) + x.bandwidth() / 2)
      .y(d => y(d.Total));
  
    this.svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', 'steelblue')
      .attr('stroke-width', 2)
      .attr('d', line);
  
    this.svg.append('g')
      .attr('class', 'axis axis-x')
      .attr('transform', `translate(0,${this.height})`)
      .call(d3.axisBottom(x));
  
    this.svg.append('g')
      .attr('class', 'axis axis-y')
      .call(yAxis); // Aplicar el eje Y modificado
  
    // Estilo adicional para los ticks y el texto del eje Y
    this.svg.selectAll('.axis-y text')
      .attr('fill', 'black')
      .style('font-size', '12px');
  
    this.svg.selectAll('.axis-y line')
      .attr('stroke', '#ccc')
      .attr('stroke-width', '1px')
      .attr('shape-rendering', 'crispEdges');
  }
  
  
  
}
