import { Component, OnInit, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { DialogTurnoComponent } from 'src/app/components/dialog-turno/dialog-turno.component';
import { Turno } from 'src/app/models/turno.models';
import { LoginService } from 'src/app/services/auth/login.service';
import { StorageService } from 'src/app/services/storage.service';
import { TurnoService } from 'src/app/services/turno.service';
import { DataService } from 'src/app/services/data.service';
import { VentaService } from 'src/app/services/venta.service';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { Configuracion } from 'src/app/models/configuracion.models';
import { EstacionTipoEnum, NivelUsuarioEnum } from 'src/app/enums/enum';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {

  private headerVisibleSubject = new BehaviorSubject<boolean>(true);
  headerVisible$ = this.headerVisibleSubject.asObservable();

  isMainMenuOpen  = false;
  userLoginOn     = false;
  idturnoShare    = 0;
  nroturnoShare   = 0;
  turnoOpenShare  = false;
  UsuarioShare    = '';
  public userLoged: any = { id: '', username: '' };
  title           = '';
  sDatosUsuarioTurno = '';
  turnoAbierto: Turno;

  // ── Info header ────────────────────────────────────────────
  currentTime   = '';
  currentDate   = '';
  nombreUsuario = '';
  nombreSucursal = '';
  turnoNumero   = 0;
  turnoActivo   = false;

  // ── Config (moneda) ────────────────────────────────────────
  config: Configuracion | null = null;

  // ── Visibilidad del menú ───────────────────────────────────
  showDashboard     = false;
  showAdministracion = false;
  showCaja          = false;
  showMozo          = false;

  private calcMenuVisibility(): void {
    const user = this.storageService.getCurrentUser();
    if (!user) return;

    const nivel   = user.IdNivel   as NivelUsuarioEnum;
    const estacion = user.TipoCompu as EstacionTipoEnum;

    const isAdmin  = nivel   === NivelUsuarioEnum.Administrador;
    const isCajero = nivel   === NivelUsuarioEnum.Cajero;
    const isMozo   = nivel   === NivelUsuarioEnum.Mozo;
    const esCaja   = estacion === EstacionTipoEnum.CAJA;
    const esMozo   = estacion === EstacionTipoEnum.MOZO;
    const sinConfig = !esCaja && !esMozo; // ADMINISTRADOR (0) o no definido

    if (isAdmin) {
      this.showDashboard      = true;
      this.showAdministracion = true;
      this.showCaja           = esCaja;
      this.showMozo           = esMozo;
    } else if (isCajero) {
      this.showDashboard      = false;
      this.showAdministracion = false;
      this.showCaja           = esCaja;
      this.showMozo           = false;
    } else if (isMozo) {
      this.showDashboard      = false;
      this.showAdministracion = false;
      this.showCaja           = false;
      this.showMozo           = esMozo;
    }
  }

  // ── Stats del turno ────────────────────────────────────────
  totalVentaTurno = 0;
  nroPedidos      = 0;
  ticketMedio     = 0;

  private clockInterval: any;
  private statsInterval: any;

  constructor(
    private spinnerService: NgxSpinnerService,
    private router: Router,
    private loginService: LoginService,
    private storageService: StorageService,
    private dialogTurno: MatDialog,
    private TurnoService: TurnoService,
    private dataService: DataService,
    private ventaService: VentaService,
    private configuracionService: ConfiguracionService,
  ) { }

  // ── Reloj ──────────────────────────────────────────────────
  private updateClock(): void {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const raw = now.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    this.currentDate = raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  // ── Usuario ────────────────────────────────────────────────
  private loadUserInfo(): void {
    const user = this.storageService.getCurrentUser();
    if (user) {
      this.nombreUsuario = user.NombreEmpleado || user.NombreUsuario || '';
      this.UsuarioShare  = this.nombreUsuario;
      this.userLoginOn   = true;
    }
    this.nombreSucursal = this.storageService.getCurrentNombreSucursal() || 'LaComanda';
    this.calcMenuVisibility();
  }

  // ── Turno ──────────────────────────────────────────────────
  private checkTurno(): void {
    const ip = this.storageService.getCurrentIP();
    if (!ip) return;

    this.TurnoService.ObtenerTurnoByIP(ip).subscribe({
      next: (data) => {
        if (data?.Data != null) {
          this.turnoAbierto  = data.Data;
          this.turnoNumero   = data.Data.NroTurno;
          this.turnoActivo   = true;
          this.turnoOpenShare = true;
          this.loadTurnoStats(data.Data.IdTurno);
        } else {
          this.turnoActivo    = false;
          this.turnoOpenShare = false;
        }
      },
      error: () => { this.turnoActivo = false; }
    });
  }

  // ── Stats del turno ────────────────────────────────────────
  private loadTurnoStats(idTurno: number): void {
    this.ventaService.getListadoVentas(idTurno, 0).subscribe({
      next: (ventas) => {
        const activas = ventas.filter(v => v.EstadoDescripcion !== 'ANULADO');
        this.nroPedidos      = activas.length;
        this.totalVentaTurno = activas.reduce((sum, v) => sum + (v.Total || 0), 0);
        this.ticketMedio     = this.nroPedidos > 0
          ? this.totalVentaTurno / this.nroPedidos
          : 0;
      },
      error: () => {
        this.nroPedidos = 0;
        this.totalVentaTurno = 0;
        this.ticketMedio = 0;
      }
    });
  }

  // ── Navegación ─────────────────────────────────────────────
  hideHeader() { this.headerVisibleSubject.next(false); }
  showHeader()  { this.headerVisibleSubject.next(true); }

  public onLogout(): void {
    this.storageService.logout();
    this.exitFullScreen();
  }

  public Caja(): void {
    this.TurnoService.ObtenerTurnoByIP(this.storageService.getCurrentIP()).subscribe(data => {
      if (data?.Data != null) {
        this.turnoAbierto = data.Data;
        this.title = 'Caja';
        this.router.navigateByUrl('/caja');
      } else {
        Swal.fire({ icon: 'warning', title: 'No hay un turno abierto para esta estación', confirmButtonText: 'Aceptar' });
      }
    });
  }

  public Mozo(): void {
    this.TurnoService.ObtenerTurnoByIP(this.storageService.getCurrentIP()).subscribe(data => {
      if (data?.Data != null) {
        this.turnoAbierto = data.Data;
        this.title = 'Mozo';
        this.router.navigateByUrl('/mozo');
      } else {
        Swal.fire({ icon: 'warning', title: 'No hay un turno abierto para esta estación', confirmButtonText: 'Aceptar' });
      }
    });
  }

  public Administracion(): void {
    this.title = this.storageService.getCurrentNombreSucursal();
    this.router.navigateByUrl('/administracion');
  }

  public Dashboard(): void {
    this.title = this.storageService.getCurrentNombreSucursal();
    this.router.navigateByUrl('/dashboard');
  }

  public reiniciar(): void {
    this.title = this.storageService.getCurrentNombreSucursal();
    this.router.navigateByUrl('/dashboard');
  }

  exitFullScreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.error(err));
    }
  }

  OpenDialogTurno(): void {
    this.dialogTurno.open(DialogTurnoComponent, {
      disableClose: true, hasBackdrop: true, width: '600px', height: '400px'
    });
  }

  async ngOnInit(): Promise<void> {
    this.spinnerService.show();

    // Reloj (cada segundo)
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);

    // Configuración (símbolo de moneda)
    this.configuracionService.get().subscribe(cfg => this.config = cfg);

    // Usuario y sucursal
    this.loadUserInfo();

    // Turno + stats
    this.checkTurno();

    // Refrescar stats cada 2 minutos
    this.statsInterval = setInterval(() => {
      if (this.turnoActivo && this.turnoAbierto?.IdTurno) {
        this.loadTurnoStats(this.turnoAbierto.IdTurno);
      }
    }, 120_000);

    // Título dinámico
    this.dataService.currentVariable.subscribe(value => {
      this.title = value;
    });
  }

  ngOnDestroy(): void {
    if (this.clockInterval)  clearInterval(this.clockInterval);
    if (this.statsInterval)  clearInterval(this.statsInterval);
  }
}
