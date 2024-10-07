import { Component, OnInit, ElementRef, ViewChild, Input, OnChanges, SimpleChanges } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';
import * as d3 from 'd3';
import Swal from 'sweetalert2';
import { VentaService } from '../../../services/venta.service';
import { ventadiariasemanalmensual } from 'src/app/models/ventadiariasemanalmensual.models';
import { formatDate } from '@angular/common';
import { StorageService } from 'src/app/services/storage.service';
@Component({
  selector: 'app-canal-venta',
  templateUrl: './canal-venta.component.html',
  styleUrls: ['./canal-venta.component.css']
})
export class CanalVentaComponent implements OnInit, OnChanges  {
  @ViewChild('chart', { static: true }) 
  private chartContainer: ElementRef;
  @Input() fechaInicial: Date;
  @Input() fechaFinal: Date;
  totalVentaMesa: number;
  totalVentaLlevar: number;
  totalVentaDelivery: number;
  private data: ventadiariasemanalmensual[];
  private svg;
  private width: number;
  private height: number;
  private radius: number;
  private color;
  private tooltip;

  constructor(private spinnerService: NgxSpinnerService, private ventaService: VentaService,   private storageService: StorageService,) { }

  ngOnInit(): void {
    try {
      this.width = this.chartContainer.nativeElement.offsetWidth;
      this.height = this.chartContainer.nativeElement.offsetHeight;
      this.radius = Math.min(this.width, this.height) / 2;
  
      this.initSvg();
      var fechaInicial = formatDate(this.fechaInicial, 'yyyyMMdd', 'en-US')
      var fechaFinal = formatDate(this.fechaFinal, 'yyyyMMdd', 'en-US')
      this.getVentasPorCanal(fechaInicial, fechaFinal); // Inicializar con datos diarios
      
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
  
      this.getVentasPorCanal(fechaInicial, fechaFinal); // Inicializar con datos diarios
      }
    }
  }
  private initSvg() {
    this.color = d3.scaleOrdinal(d3.schemeCategory10);

    this.svg = d3.select(this.chartContainer.nativeElement)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
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

  async getVentasPorCanal(fechaInicial: string, fechaFinal: string) {
    
    this.spinnerService.show('canalVentaSpinner');

      const data = await this.ventaService.getVentasPorCanal(fechaInicial, fechaFinal).toPromise();
      this.data = data;
  
      this.totalVentaMesa = this.data.reduce((acc, venta) => {return venta.Agrupado==='Para Mesa'? acc + venta.Total: acc}, 0);
      this.totalVentaLlevar = this.data.reduce((acc, venta) => {return venta.Agrupado==='Para Llevar'? acc + venta.Total: acc}, 0);
      this.totalVentaDelivery = this.data.reduce((acc, venta) => {return venta.Agrupado==='Delivery'? acc + venta.Total: acc}, 0);
      this.updateChart();
      this.spinnerService.hide('canalVentaSpinner');
  }


  private updateChart() {
    const pie = d3.pie<ventadiariasemanalmensual>().value((d: ventadiariasemanalmensual) => d.Total);
    const arc = d3.arc<ventadiariasemanalmensual>()
      .outerRadius(this.radius - 10)
      .innerRadius(0);

    const labelArc = d3.arc<ventadiariasemanalmensual>()
      .outerRadius(this.radius - 40)
      .innerRadius(this.radius - 40);

    const update = this.svg.selectAll('.arc').data(pie(this.data));

    update.exit().remove();

    const enter = update.enter().append('g')
      .attr('class', 'arc');

    enter.append('path')
      .attr('d', arc)
      .attr('fill', (d: any) => this.color(d.data.Agrupado))
      .on('mouseover', (event: MouseEvent, d: any) => {
        this.tooltip.transition()
          .duration(200)
          .style('opacity', .9);
        this.tooltip.html(`${d.data.Agrupado} - Total Venta S/.  ${d.data.Total}`)
          .style('left', (event.pageX + 5) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', () => {
        this.tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });

    enter.append('text')
      .attr('transform', (d: any) => `translate(${labelArc.centroid(d)})`)
      .attr('dy', '0.35em')
      .style('font-size', '12px')  // Ajusta el tamaño de la fuente
      .style('text-anchor', 'middle')  // Alinea el texto al centro
      .style('fill', 'black')  // Color del texto
      .text((d: any) => `${d.data.Agrupado} (${((d.endAngle - d.startAngle) / (2 * Math.PI) * 100).toFixed(2)}%)`);

    update.select('path')
      .attr('d', arc)
      .attr('fill', (d: any) => this.color(d.data.Agrupado));

    update.select('text')
      .attr('transform', (d: any) => `translate(${labelArc.centroid(d)})`)
      .text((d: any) => `${d.data.Agrupado} (${((d.endAngle - d.startAngle) / (2 * Math.PI) * 100).toFixed(2)}%)`);
  }
}
