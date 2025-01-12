import { Component, OnInit } from '@angular/core';
import { Usuario } from 'src/app/models/usuario.models';
import Swal from 'sweetalert2';
import { NgxSpinnerService } from 'ngx-spinner';
import { StorageService } from 'src/app/services/storage.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  fechaInicial: string;
  fechaFinal: string;
  maxFechaInicial: string;
  minFechaFinal: string;
  maxFechaFinal: string;
  minFechaInicial: string;
  userLoginOn: boolean = false;
  userData?: Usuario;

  reportes = [
    { titulo: 'Ventas Diarias', componente: 'ventas-diarias', visible: false },
    { titulo: 'Popularidad de Platos', componente: 'popularidad-platos', visible: false },
    { titulo: 'Horas Pico', componente: 'horas-pico', visible: false },
    { titulo: 'Canal de Venta', componente: 'canal-venta', visible: false },
    { titulo: 'Anulaciones', componente: 'anulaciones', visible: false }
    // Puedes agregar más reportes aquí:
    // { titulo: 'Nuevo Reporte', componente: 'nuevo-reporte', visible: false }
  ];

  constructor(
    private storageService: StorageService,
    private spinnerService: NgxSpinnerService
  ) { 
    const lastday = new Date(new Date());
    lastday.setDate(new Date().getDate() - 1);
    this.fechaInicial = this.formatDate(lastday);
    this.fechaFinal = this.formatDate(lastday);
    this.updateDateLimits();
  }

  updateDateLimits() {
    if (this.fechaInicial && this.fechaFinal) {
      // Update max fecha final
      const maxFinalDate = new Date(this.fechaInicial);
      maxFinalDate.setMonth(maxFinalDate.getMonth() + 6);
      this.maxFechaInicial = this.formatDate(maxFinalDate);

      // Update min fecha inicial
      const minInitialDate = new Date(this.fechaFinal);
      minInitialDate.setMonth(minInitialDate.getMonth() - 6);
      this.minFechaFinal = this.formatDate(minInitialDate);

      // Also set max fecha inicial to today
      this.maxFechaInicial = this.formatDate(new Date());

      // Set min and max for fecha final
      this.minFechaInicial = this.formatDate(new Date(this.fechaFinal));
      this.maxFechaFinal = this.formatDate(maxFinalDate);
    }
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  onFechaInicialChange() {
    if (this.fechaInicial && this.fechaFinal) {
      const maxDate = new Date(this.fechaInicial);
      maxDate.setMonth(maxDate.getMonth() + 6);
      if (new Date(this.fechaFinal) > maxDate) {
        this.fechaFinal = this.formatDate(maxDate);
      }
      if (this.fechaFinal < this.fechaInicial) {
        this.fechaFinal = this.fechaInicial;
      }
      this.updateDateLimits();
    }
  }

  onFechaFinalChange() {
    if (this.fechaInicial && this.fechaFinal) {
      const minDate = new Date(this.fechaFinal);
      minDate.setMonth(minDate.getMonth() - 6);
      if (new Date(this.fechaInicial) < minDate) {
        this.fechaInicial = this.formatDate(minDate);
      }
      if (this.fechaInicial > this.fechaFinal) {
        this.fechaInicial = this.fechaFinal;
      }
      this.updateDateLimits();
    }
  }

  updateVisibleReportes() {
    this.visibleReportes = this.reportes.filter(rep => rep.visible === true);
  }

  visibleReportes = [];
  async ngOnInit() {
    try {
      this.spinnerService.show();
      
      this.updateVisibleReportes();

    } catch(e) {
      this.salir();
      Swal.fire('Error', e.message, 'error');
    } finally {
      this.spinnerService.hide();
    }
  }
  public salir(): void {
    this.storageService.logout();
  }
}
