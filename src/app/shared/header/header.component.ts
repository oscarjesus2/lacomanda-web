import { Component, OnInit, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
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
import { UsuarioService } from 'src/app/services/usuario.service';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';
import Swal from 'sweetalert2';
import { ControlHorarioComponent } from 'src/app/components/control-horario/control-horario.component';
import { LicenciaTenantService } from 'src/app/services/licencia-tenant.service';

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
  controlHorarioHabilitado = false;

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
    private router: Router,
    private loginService: LoginService,
    private storageService: StorageService,
    private dialogTurno: MatDialog,
    private TurnoService: TurnoService,
    private dataService: DataService,
    private ventaService: VentaService,
    private configuracionService: ConfiguracionService,
    private usuarioService: UsuarioService,
    private licenciaTenantService: LicenciaTenantService,
    public textCatalog: TenantTextCatalogService,
  ) { }

  // ── Reloj ──────────────────────────────────────────────────
  private updateClock(): void {
    const now = new Date();
    const culture = this.textCatalog.culture;
    this.currentTime = now.toLocaleTimeString(culture, { hour: '2-digit', minute: '2-digit' });
    const raw = now.toLocaleDateString(culture, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
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
        this.title = this.textCatalog.get('register');
        this.router.navigateByUrl('/caja');
      } else {
        Swal.fire({
          icon: 'warning',
          title: this.textCatalog.get('noOpenShiftForStation'),
          confirmButtonText: this.textCatalog.get('accept'),
        });
      }
    });
  }

  public Mozo(): void {
    this.TurnoService.ObtenerTurnoByIP(this.storageService.getCurrentIP()).subscribe(data => {
      if (data?.Data != null) {
        this.turnoAbierto = data.Data;
        this.title = this.textCatalog.get('orderAttendant');
        this.router.navigateByUrl('/mozo');
      } else {
        Swal.fire({
          icon: 'warning',
          title: this.textCatalog.get('noOpenShiftForStation'),
          confirmButtonText: this.textCatalog.get('accept'),
        });
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
      disableClose: true,
      hasBackdrop: true,
      width: '560px',
      maxWidth: '95vw'
    });
  }

  OpenControlHorario(): void {
    this.dialogTurno.open(ControlHorarioComponent, {
      disableClose: false,
      hasBackdrop: true,
      width: '520px',
      maxWidth: '96vw',
    });
  }

  public cambiarCultura(cultura: string | null): void {
    const session = this.storageService.getCurrentSession();
    if (!session) {
      return;
    }

    this.usuarioService.actualizarCulturaPropia(cultura).subscribe({
      next: response => {
        const culturaPreferida = response?.Data?.Cultura ?? null;
        session.User.Cultura = culturaPreferida;
        session.Cultura =
          culturaPreferida
          || session.CulturaTenant
          || session.Cultura
          || 'en';

        this.storageService.setCurrentSession(session);
        this.textCatalog.setCulture(session.Cultura);
        this.updateClock();
        if (this.router.url.startsWith('/mozo')) {
          const title = this.textCatalog.get('orderAttendant');
          this.title = title;
          this.dataService.updateVariable_TituloHeader(title);
        }
      },
      error: () => {
        Swal.fire(
          this.textCatalog.get('error'),
          this.textCatalog.get('cultureChangeError'),
          'error',
        );
      },
    });
  }

  async ngOnInit(): Promise<void> {
    // Reloj (cada segundo)
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);

    // No cargar datos en la pantalla de login (evita 500 aunque haya token residual)
    const esLogin = this.router.url.startsWith('/iniciar-sesion');
    const sesionActiva = !!this.storageService.getCurrentSession();
    if (esLogin || !sesionActiva) return;

    // Configuración (símbolo de moneda)
    this.configuracionService.get().subscribe(cfg => this.config = cfg);

    // Usuario y sucursal
    this.loadUserInfo();

    this.licenciaTenantService.obtener().subscribe({
      next: response => {
        const licencia = response.Data;
        this.controlHorarioHabilitado = licencia?.Caracteristicas?.some(
          caracteristica =>
            caracteristica.Codigo === 'personal.control_horario' &&
            caracteristica.Habilitada,
        ) === true;
      },
      error: () => this.controlHorarioHabilitado = false,
    });

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
