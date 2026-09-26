import { Component, OnInit, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { NavigationEnd, Router } from '@angular/router';
import { filter, take } from 'rxjs/operators';
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
import { SesionUsuarioService } from 'src/app/services/sesion-usuario.service';
import Swal from 'sweetalert2';
import { ControlHorarioComponent } from 'src/app/components/control-horario/control-horario.component';
import { LicenciaTenantService } from 'src/app/services/licencia-tenant.service';
import { CajaService } from 'src/app/services/caja.service';
import { CARACTERISTICAS_LICENCIA } from 'src/app/constants/caracteristicas-licencia';

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
  cajasConTurnoAbierto = 0;

  // ── Config (moneda) ────────────────────────────────────────
  config: Configuracion | null = null;

  // ── Visibilidad del menú ───────────────────────────────────
  showDashboard     = false;
  showAdministracion = false;
  showCaja          = false;
  showMozo          = false;
  controlHorarioHabilitado = false;
  private operacionCajaHabilitada = false;
  private reportesAnaliticosHabilitados = false;

  private calcMenuVisibility(): void {
    const user = this.storageService.getCurrentUser();
    if (!user) {
      this.showDashboard = false;
      this.showAdministracion = false;
      this.showCaja = false;
      this.showMozo = false;
      return;
    }

    const nivel   = user.IdNivel   as NivelUsuarioEnum;
    const estacion = user.TipoCompu as EstacionTipoEnum;

    const isAdmin  = nivel   === NivelUsuarioEnum.Administrador;
    const isGerente = nivel  === NivelUsuarioEnum.Gerente;
    const isCajero = nivel   === NivelUsuarioEnum.Cajero;
    const isMozo   = nivel   === NivelUsuarioEnum.Mozo;
    const esCaja   = estacion === EstacionTipoEnum.CAJA;
    const esMozo   = estacion === EstacionTipoEnum.MOZO;
    if (isGerente) {
      this.showDashboard      = this.reportesAnaliticosHabilitados;
      this.showAdministracion = true;
      this.showCaja           = false;
      this.showMozo           = false;
    } else if (isAdmin) {
      this.showDashboard      = this.reportesAnaliticosHabilitados;
      this.showAdministracion = true;
      this.showCaja           = esCaja && this.operacionCajaHabilitada;
      this.showMozo           = esMozo && this.operacionCajaHabilitada;
    } else if (isCajero) {
      this.showDashboard      = false;
      this.showAdministracion = false;
      this.showCaja           = esCaja && this.operacionCajaHabilitada;
      this.showMozo           = false;
    } else if (isMozo) {
      this.showDashboard      = false;
      this.showAdministracion = false;
      this.showCaja           = false;
      this.showMozo           = esMozo && this.operacionCajaHabilitada;
    }
  }

  // ── Stats del turno ────────────────────────────────────────
  totalVentaTurno = 0;
  nroPedidos      = 0;
  ticketMedio     = 0;

  private clockInterval: any;
  private statsInterval: any;
  private initialNavigationSubscription?: Subscription;

  constructor(
    private router: Router,
    private loginService: LoginService,
    private storageService: StorageService,
    private dialogTurno: MatDialog,
    private TurnoService: TurnoService,
    private cajaService: CajaService,
    private dataService: DataService,
    private ventaService: VentaService,
    private configuracionService: ConfiguracionService,
    private usuarioService: UsuarioService,
    private licenciaTenantService: LicenciaTenantService,
    public textCatalog: TenantTextCatalogService,
    private sesionUsuario: SesionUsuarioService,
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
    // El turno de la cabecera pertenece a esta estación; otras cajas pueden
    // tener turnos abiertos sin que exista uno asociado a su IP.
    this.cajaService.getAllCaja(true).subscribe({
      next: response => {
        this.cajasConTurnoAbierto = (response.Data ?? [])
          .filter(caja => !!caja.TurnoAbierto).length;
      },
      error: () => { this.cajasConTurnoAbierto = 0; },
    });
    const ip = this.storageService.getCurrentIP();
    if (!ip) {
      this.turnoActivo = false;
      return;
    }

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
    this.ventaService.getVentasTurno(idTurno).subscribe({
      next: (response) => {
        const activas = (response.Data ?? []).filter(
          venta => (venta.Estado ?? '').toLocaleUpperCase() !== 'ANULADO',
        );
        this.nroPedidos      = activas.length;
        this.totalVentaTurno = activas.reduce(
          (sum, venta) => sum + (venta.Total || venta.Monto || 0),
          0,
        );
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
    // Liberar la sesión evita dejarla marcada como activa en otro equipo.
    this.sesionUsuario.liberar();
    this.storageService.logout();
    this.exitFullScreen();
  }

  public Caja(): void {
    // Caja muestra su propia pantalla previa cuando aún no existe turno.
    this.title = this.textCatalog.get('register');
    this.router.navigateByUrl('/caja');
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
    this.router.navigateByUrl(
      this.showDashboard ? '/dashboard' : '/administracion',
    );
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
    }).afterClosed().subscribe(() => this.checkTurno());
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

    // Durante el bootstrap Router.url todavía puede ser '/'. Esperamos a que la
    // navegación inicial termine antes de decidir si se pueden pedir datos
    // protegidos; así una carga directa del login nunca dispara config/licencia.
    if (!this.router.navigated || this.router.getCurrentNavigation()) {
      this.initialNavigationSubscription = this.router.events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        take(1),
      ).subscribe(event => this.initializeAuthenticatedHeader(event.urlAfterRedirects));
      return;
    }

    this.initializeAuthenticatedHeader(this.router.url);
  }

  private initializeAuthenticatedHeader(url: string): void {
    // No cargar datos en pantallas públicas ni sin una sesión vigente.
    const esLogin = url.startsWith('/iniciar-sesion') || url.startsWith('/inicio');
    const sesionActiva = !!this.storageService.getCurrentSession();
    if (esLogin || !sesionActiva) return;

    // Configuración (símbolo de moneda)
    this.configuracionService.get().subscribe(cfg => this.config = cfg);

    // Usuario y sucursal
    this.loadUserInfo();

    this.licenciaTenantService
      .tieneCaracteristica(CARACTERISTICAS_LICENCIA.PersonalControlHorario)
      .subscribe(habilitado => (this.controlHorarioHabilitado = habilitado));

    this.licenciaTenantService
      .tieneCaracteristica(CARACTERISTICAS_LICENCIA.OperacionCaja)
      .subscribe(habilitado => {
        this.operacionCajaHabilitada = habilitado;
        this.calcMenuVisibility();
      });

    this.licenciaTenantService
      .tieneCaracteristica(CARACTERISTICAS_LICENCIA.ReportesAnaliticos)
      .subscribe(habilitado => {
        this.reportesAnaliticosHabilitados = habilitado;
        this.calcMenuVisibility();
      });

    // Turno + stats
    this.checkTurno();

    // Refrescar stats cada 2 minutos
    this.statsInterval = setInterval(() => {
      this.checkTurno();
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
    this.initialNavigationSubscription?.unsubscribe();
    if (this.clockInterval)  clearInterval(this.clockInterval);
    if (this.statsInterval)  clearInterval(this.statsInterval);
  }
}
