import { Component, OnInit } from '@angular/core';
import { User } from 'src/app/models/user.models';
import { LoginService } from 'src/app/services/auth/login.service';
import Swal from 'sweetalert2';
import { TurnoService } from '../../services/turno.services';
import { NgxSpinnerService } from 'ngx-spinner';
import { StorageService } from 'src/app/services/storage.services';

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
  userData?: User;

  constructor(
    private loginService: LoginService,
    private turnoService: TurnoService,
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

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  onFechaInicialChange() {
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

  onFechaFinalChange() {
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

  async ngOnInit() {
    try {
      this.spinnerService.show();

      if (this.storageService.isAuthenticated()) {
        const user = this.storageService.getCurrentSession().user.Usuario;
        this.loginService.UsuarioShare.emit(user);
      }
      this.turnoService.ObtenerTurno('001').subscribe(data => {
        if (data === null) {
   
          this.loginService.userLoginOn.emit(true);  
          this.loginService.idturnoShare.emit(0);
          this.loginService.nroturnoShare.emit(0);
          this.loginService.turnoOpenShare.emit(false);
        } else {
          console.error('error aqui 3');
          this.loginService.userLoginOn.emit(true);  
          this.loginService.idturnoShare.emit(data.IdTurno);
          this.loginService.nroturnoShare.emit(data.NroTurno);
          this.loginService.turnoOpenShare.emit(true);
        }
      });

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
