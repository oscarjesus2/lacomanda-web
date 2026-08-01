import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { KeycloakAuthService } from 'src/app/services/auth/keycloak-auth.service';
import { KeycloakService } from 'src/app/services/auth/keycloak.service';
import { StorageService } from 'src/app/services/storage.service';
import { EstacionService } from 'src/app/services/estacion.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { NotificationService } from 'src/app/services/notification.service';
import { Session } from 'src/app/models/session.models';
import { TenantService } from 'src/app/services/tenant.service';
import { MatDialog } from '@angular/material/dialog';
import { version } from 'src/environments/version';
import { CookieService } from 'ngx-cookie-service';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { Configuracion } from 'src/app/models/configuracion.models';
import { ConfiguracionInicialComponent } from 'src/app/components/configuracion-inicial/configuracion-inicial/configuracion-inicial.component';
import { HeaderService } from 'src/app/services/header.service';
import { EstacionTipoEnum } from 'src/app/enums/enum';
import { UsuarioService } from 'src/app/services/usuario.service';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';
import { Usuario } from 'src/app/models/usuario.models';
import Swal from 'sweetalert2';

interface PendingLogin {
  TenantId: string;
  Sucursal: string;
  Cultura:  string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  appVersion  = version;
  isSubmitting = false;
  loginValid  = true;
  loginError  = '';

  /** true si ya existe la cookie clientUUID → no se pide identificador */
  identifierExists = false;

  // ── Forgot password ───────────────────────────────────────────────────────
  showForgotPassword    = false;
  forgotUsername        = '';
  forgotSending         = false;
  forgotSent            = false;
  forgotError           = '';

  tenantDefault: TenantDefault[] = [];
  loginForm: FormGroup;
  CurrentIP: string;

  deferredPrompt: any;
  showInstallButton = false;
  isiOS = false;

  /** Clave donde se guarda el tenant elegido mientras dura el redirect a Keycloak. */
  private static readonly PENDING_LOGIN_KEY = 'pendingLogin';

  constructor(
    private dialog: MatDialog,
    private spinnerService: NgxSpinnerService,
    private fb: FormBuilder,
    private router: Router,
    private keycloakAuth: KeycloakAuthService,
    private keycloak: KeycloakService,
    private storageService: StorageService,
    private estacionService: EstacionService,
    private tenantService: TenantService,
    private notificationService: NotificationService,
    private cookieService: CookieService,
    private configService: ConfiguracionService,
    private headerService: HeaderService,
    private usuarioService: UsuarioService,
    private textCatalog: TenantTextCatalogService,
  ) {}

  @HostListener('window:beforeinstallprompt', ['$event'])
  onbeforeinstallprompt(e: Event) {
    e.preventDefault();
    this.deferredPrompt = e;
    this.showInstallButton = true;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    this.headerService.hideHeader();
    this.checkIfIos();

    const clientUUID = this.cookieService.get('clientUUID');
    if (clientUUID) {
      this.identifierExists = true;
      this.CurrentIP = clientUUID;
    }

    this.initForm();

    // ¿Volvemos del redirect de Keycloak? Completar el login antes de nada.
    if (await this.tryCompleteRedirectLogin()) {
      return;
    }

    // Sesión ya activa → navegar directo.
    const currentSession = this.storageService.getCurrentSession();
    if (currentSession) {
      this.textCatalog.setCulture(
        currentSession.Cultura ?? currentSession.CulturaTenant,
      );
      const route = this.keycloakAuth.getTargetRoute(currentSession.Token);
      this.router.navigateByUrl(route);
      return;
    }

    this.loadTenants();
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  initForm(): void {
    // Las credenciales ya no se recogen aquí: solo se elige el tenant (sucursal).
    this.loginForm = this.fb.group({
      tenant: [null, Validators.required],
    });
  }

  // ── Login (redirect a Keycloak) ─────────────────────────────────────────────

  async login(): Promise<void> {
    if (this.loginForm.invalid || this.isSubmitting) return;

    const { tenant } = this.loginForm.getRawValue();
    this.isSubmitting = true;
    this.loginValid   = true;
    this.spinnerService.show();

    // Se persiste el tenant elegido para reconstruir la sesión al volver del redirect.
    const pending: PendingLogin = {
      TenantId: tenant.TenantId,
      Sucursal: tenant.Sucursal,
      Cultura:  tenant.Cultura,
    };
    localStorage.setItem(LoginComponent.PENDING_LOGIN_KEY, JSON.stringify(pending));

    try {
      // Redirige el navegador a la página de login de Keycloak del realm del tenant.
      await this.keycloak.login(tenant.TenantId);
    } catch {
      localStorage.removeItem(LoginComponent.PENDING_LOGIN_KEY);
      this.isSubmitting = false;
      this.spinnerService.hide();
      this.loginValid = false;
    }
  }

  /**
   * Si la URL actual es el callback de Keycloak y hay un login pendiente,
   * completa el intercambio de código (PKCE) y construye la sesión.
   */
  private async tryCompleteRedirectLogin(): Promise<boolean> {
    const pendingRaw = localStorage.getItem(LoginComponent.PENDING_LOGIN_KEY);
    if (!pendingRaw) return false;

    const params = window.location.search + window.location.hash;
    const hasCallback = /[?&#](code|state|session_state|error)=/.test(params);
    if (!hasCallback) {
      // Login pendiente sin callback (p. ej. el usuario volvió atrás) → limpiar.
      localStorage.removeItem(LoginComponent.PENDING_LOGIN_KEY);
      return false;
    }

    const pending = JSON.parse(pendingRaw) as PendingLogin;
    this.spinnerService.show();

    try {
      const tokens = await this.keycloak.completeLogin(pending.TenantId);
      localStorage.removeItem(LoginComponent.PENDING_LOGIN_KEY);

      if (!tokens) {
        this.spinnerService.hide();
        this.loadTenants();
        return false;
      }

      this.completarSesion(tokens.token, tokens.refreshToken, pending);
      return true;
    } catch {
      localStorage.removeItem(LoginComponent.PENDING_LOGIN_KEY);
      this.spinnerService.hide();
      this.loginValid = false;
      this.loadTenants();
      return false;
    }
  }

  /**
   * Construye la sesión con los tokens de Keycloak y ejecuta la orquestación
   * post-login (roles, estación, cultura, config y navegación). Es la misma
   * lógica que antes seguía al ROPC, ahora alimentada por el redirect flow.
   */
  private completarSesion(
    token: string,
    refreshToken: string,
    pending: PendingLogin,
  ): void {
    const roles   = this.keycloakAuth.getRoles(token);
    const usuario = this.keycloakAuth.buildUsuarioFromToken(token);

    const isAdmin = roles.includes('admin');
    const isCaja  = roles.includes('caja');
    const isMozo  = roles.includes('mozo');
    const hasRole = isAdmin || isCaja || isMozo;

    if (!hasRole) {
      this.spinnerService.hide();
      this.notificationService.showWarning(this.textCatalog.get('noBusinessRole'));
      this.loadTenants();
      return;
    }

    if (this.CurrentIP) {
      // Guardar sesión con token ANTES de llamar a la API,
      // para que el interceptor pueda adjuntar el Authorization header.
      const session = new Session(
        token,
        refreshToken,
        usuario,
        this.CurrentIP,
        pending.TenantId,
        pending.Sucursal,
        pending.Cultura,
      );
      this.storageService.setCurrentSession(session);
      this.inicializarCulturaUsuario(session, usuario);

      // La estación manda sobre el rol para determinar la ruta.
      this.estacionService.getAll().subscribe({
        next: (estResp) => {
          this.spinnerService.hide();

          const estaciones = estResp?.Data ?? [];
          const estacion   = estaciones.find(e => e.IdentificadorUnico === this.CurrentIP);

          if (!estacion) {
            this.ensureConfigThenNavigate('/dashboard');
            return;
          }

          usuario.TipoCompu = estacion.Tipo;
          session.User      = usuario;
          this.storageService.setCurrentSession(session);

          if (estacion.Tipo === EstacionTipoEnum.CAJA) {
            this.router.navigateByUrl('/caja');
          } else if (estacion.Tipo === EstacionTipoEnum.MOZO) {
            this.router.navigateByUrl('/mozo');
          } else {
            this.ensureConfigThenNavigate('/dashboard');
          }
        },
        error: () => {
          this.spinnerService.hide();
          this.storageService.removeCurrentSession();
          this.notificationService.showError(this.textCatalog.get('couldNotLoadStations'));
          this.loadTenants();
        }
      });

    } else {
      // Sin cookie de estación: solo admin puede continuar (hacia dashboard).
      if (!isAdmin) {
        this.spinnerService.hide();
        Swal.fire({
          title: this.textCatalog.get('stationNotConfigured'),
          text: this.textCatalog.get('stationIdentifierMissing'),
          icon: 'warning',
          confirmButtonText: this.textCatalog.get('accept')
        });
        this.loadTenants();
        return;
      }

      usuario.TipoCompu = EstacionTipoEnum.ADMINISTRADOR;
      const session = new Session(
        token,
        refreshToken,
        usuario,
        this.CurrentIP,
        pending.TenantId,
        pending.Sucursal,
        pending.Cultura,
      );
      this.storageService.setCurrentSession(session);
      this.inicializarCulturaUsuario(session, usuario);

      this.spinnerService.hide();
      this.ensureConfigThenNavigate('/dashboard');
    }
  }

  /**
   * El tenant aporta la cultura inicial. La preferencia persistida del usuario,
   * cuando existe, la reemplaza sin modificar el país ni sus reglas fiscales.
   */
  private inicializarCulturaUsuario(
    session: Session,
    usuario: Usuario,
  ): void {
    this.textCatalog.setCulture(session.Cultura);

    this.usuarioService.getUsuarioActual().subscribe({
      next: response => {
        const perfil = response?.Data;
        const activeSession = this.storageService.getCurrentSession();
        if (!perfil || activeSession?.Token !== session.Token) {
          return;
        }

        const token = usuario.Token;
        const tipoCompu = usuario.TipoCompu;
        Object.assign(usuario, perfil);
        usuario.Token = token;
        usuario.TipoCompu = tipoCompu;

        session.User = usuario;
        session.Cultura = perfil.Cultura || session.CulturaTenant;
        this.storageService.setCurrentSession(session);
        this.textCatalog.setCulture(session.Cultura);
      },
      error: () => {
        // La preferencia es opcional. Ante un fallo se conserva el valor
        // predeterminado del tenant y el inicio de sesión puede continuar.
        this.textCatalog.setCulture(session.CulturaTenant);
      },
    });
  }

  // ── Config guard ──────────────────────────────────────────────────────────

  private isConfigValid(cfg: Configuracion | null | undefined): boolean {
    if (!cfg) return false;
    return !!cfg.RazonSocial && !!cfg.NombreComercial && !!cfg.Direccion &&
           !!cfg.Telefono && !!cfg.NumeroIdentificacion &&
           cfg.IdTipoIdentidad !== null && cfg.IdTipoIdentidad !== undefined;
  }

  private ensureConfigThenNavigate(targetUrl: string): void {
    this.spinnerService.show();
    this.configService.get().subscribe({
      next: (cfg) => {
        this.spinnerService.hide();
        if (this.isConfigValid(cfg)) {
          this.router.navigateByUrl(targetUrl);
        } else {
          const dialogRef = this.dialog.open(ConfiguracionInicialComponent, {
            width: '920px',
            disableClose: true,
          });
          dialogRef.afterClosed().subscribe((result) => {
            if (result === true || result === 'saved') {
              this.router.navigateByUrl(targetUrl);
            } else {
              this.logoutAndReturnToLogin();
            }
          });
        }
      },
      error: () => {
        this.spinnerService.hide();
        this.logoutAndReturnToLogin();
      }
    });
  }

  private logoutAndReturnToLogin(): void {
    try { this.storageService.logout?.(); } catch {}
    this.router.navigateByUrl('/iniciar-sesion');
  }

  // ── Forgot password ───────────────────────────────────────────────────────

  openForgotPassword(): void {
    this.forgotUsername = '';
    this.forgotSent     = false;
    this.forgotError    = '';
    this.showForgotPassword = true;
  }

  closeForgotPassword(): void {
    this.showForgotPassword = false;
    this.forgotSent  = false;
    this.forgotError = '';
  }

  sendForgotPassword(): void {
    const username = this.forgotUsername.trim();
    const tenant   = this.loginForm?.controls['tenant']?.value;

    if (!username || !tenant?.TenantId) {
      this.forgotError = this.textCatalog.get('selectBranchAndUser');
      return;
    }

    this.forgotSending = true;
    this.forgotError   = '';

    this.usuarioService.forgotPassword(username, tenant.TenantId).subscribe({
      next: () => {
        this.forgotSending = false;
        this.forgotSent    = true;
      },
      error: () => {
        this.forgotSending = false;
        // Siempre mostramos éxito (no revelar si el usuario existe)
        this.forgotSent = true;
      },
    });
  }

  // ── PWA ───────────────────────────────────────────────────────────────────

  checkIfIos(): void {
    const ua = window.navigator.userAgent.toLowerCase();
    this.isiOS = /iphone|ipad|ipod/.test(ua);
    if (this.isiOS && !window.navigator['standalone']) {
      this.showInstallButton = false;
      alert(this.textCatalog.get('iosInstallHint'));
    }
  }

  installPWA(): void {
    this.deferredPrompt.prompt();
    this.deferredPrompt.userChoice.then(() => { this.deferredPrompt = null; });
  }

  // ── Tenants ───────────────────────────────────────────────────────────────

  private async loadTenants(): Promise<void> {
    this.spinnerService.show();
    try {
      const resp    = await this.tenantService.getTenant().toPromise();
      const tenants = resp?.Data ?? [];

      if (!resp || resp.Success === false) {
        this.notificationService.showError(
          resp?.Message || this.textCatalog.get('couldNotLoadTenants')
        );
        this.loginForm?.get('tenant')?.disable();
        return;
      }
      if (tenants.length === 0) {
        this.notificationService.showWarning(
          this.textCatalog.get('noTenantsAvailable')
        );
        this.loginForm?.get('tenant')?.disable();
        return;
      }

      this.tenantDefault = tenants as any;
      if (this.tenantDefault.length === 1) {
        this.loginForm?.controls['tenant']?.setValue(this.tenantDefault[0]);
      }
    } catch {
      this.notificationService.showError(
        this.textCatalog.get('couldNotLoadTenantsRetry')
      );
      this.loginForm?.get('tenant')?.disable();
    } finally {
      this.spinnerService.hide();
    }
  }
}

interface TenantDefault {
  TenantId:  string;
  Sucursal:  string;
  Cultura: string;
  ZonaHorariaId: string;
}
