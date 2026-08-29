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

  /**
   * Solo se muestra el selector de sucursal cuando de verdad hace falta.
   * Mientras se decide o se redirige a Keycloak permanece oculto, para no
   * mostrar el selector por un instante (p. ej. al cerrar sesión).
   */
  showSelector = false;

  /** true si ya existe la cookie clientUUID → no se pide identificador */
  identifierExists = false;

  tenantDefault: TenantDefault[] = [];
  loginForm: FormGroup;
  CurrentIP: string;

  deferredPrompt: any;
  showInstallButton = false;
  isiOS = false;

  /** Tenant elegido, persistido mientras dura el redirect a Keycloak. */
  private static readonly PENDING_LOGIN_KEY = 'pendingLogin';
  /**
   * Sucursal recordada entre sesiones. Se guarda como cookie en el dominio
   * padre (.lacomanda.store) para que la página de Keycloak (otro subdominio)
   * también pueda leerla y mostrar la sucursal.
   */
  private static readonly SUCURSAL_COOKIE = 'lc_sucursal';

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

    // 1. ¿Volvemos del redirect de Keycloak? Completar el login antes de nada.
    if (await this.tryCompleteRedirectLogin()) {
      return;
    }

    // 2. ¿Piden cambiar de sucursal? (enlace "Cambiar sucursal" del login de Keycloak)
    //    Se olvida la sucursal recordada y se muestra el selector.
    if (new URLSearchParams(window.location.search).has('cambiar')) {
      this.clearSucursal();
      this.loadTenants();
      return;
    }

    // 3. Sesión ya activa → navegar directo.
    const currentSession = this.storageService.getCurrentSession();
    if (currentSession) {
      this.textCatalog.setCulture(
        currentSession.Cultura ?? currentSession.CulturaTenant,
      );
      const route = this.keycloakAuth.getTargetRoute(currentSession.Token);
      this.router.navigateByUrl(route);
      return;
    }

    // 4. ¿Hay una sucursal recordada? Primero se valida contra las sucursales
    //    publicadas para el host actual. La cookie se comparte entre subdominios
    //    y puede pertenecer a otro restaurante abierto anteriormente.
    const recordada = this.readSucursal();
    if (recordada) {
      await this.loadTenants(recordada);
      return;
    }

    // 5. Primera vez → mostrar el selector de sucursal.
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
    const pending: PendingLogin = {
      TenantId: tenant.TenantId,
      Sucursal: tenant.Sucursal,
      Cultura:  tenant.Cultura,
    };

    // Recordar la sucursal para las próximas visitas (y para que Keycloak la lea).
    this.saveSucursal(pending);

    this.isSubmitting = true;
    this.loginValid   = true;
    this.spinnerService.show();
    await this.loginWithTenant(pending);
  }

  /** Persiste el tenant y redirige el navegador al login de Keycloak de ese realm. */
  private async loginWithTenant(pending: PendingLogin): Promise<void> {
    localStorage.setItem(LoginComponent.PENDING_LOGIN_KEY, JSON.stringify(pending));
    try {
      await this.keycloak.login(pending.TenantId);
    } catch {
      localStorage.removeItem(LoginComponent.PENDING_LOGIN_KEY);
      this.isSubmitting = false;
      this.spinnerService.hide();
      this.loginValid = false;
      // Si falla el redirect con la sucursal recordada, se muestra el selector.
      this.showSelector = true;
      if (!this.tenantDefault.length) this.loadTenants();
    }
  }

  // ── Sucursal recordada (cookie compartida con Keycloak) ─────────────────────

  private cookieDomain(): string | undefined {
    const host = window.location.hostname;
    return host.endsWith('lacomanda.store') ? '.lacomanda.store' : undefined;
  }

  private saveSucursal(pending: PendingLogin): void {
    this.cookieService.set(
      LoginComponent.SUCURSAL_COOKIE,
      JSON.stringify({ TenantId: pending.TenantId, Sucursal: pending.Sucursal, Cultura: pending.Cultura }),
      { expires: 365, path: '/', domain: this.cookieDomain(), sameSite: 'Lax' },
    );
  }

  private readSucursal(): PendingLogin | null {
    const raw = this.cookieService.get(LoginComponent.SUCURSAL_COOKIE);
    if (!raw) return null;
    try {
      const s = JSON.parse(raw);
      return s?.TenantId ? { TenantId: s.TenantId, Sucursal: s.Sucursal ?? '', Cultura: s.Cultura ?? '' } : null;
    } catch {
      return null;
    }
  }

  private clearSucursal(): void {
    this.cookieService.delete(LoginComponent.SUCURSAL_COOKIE, '/', this.cookieDomain());
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
   * post-login (roles, estación, cultura, config y navegación).
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
        error: (error) => {
          this.spinnerService.hide();
          this.storageService.removeCurrentSession();
          if (error?.status === 402) {
            return;
          }
          this.notificationService.showError(this.textCatalog.get('couldNotLoadStations'));
          this.loadTenants();
        }
      });

    } else {
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
            data: { modoInicial: true },
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

  private async loadTenants(recordada?: PendingLogin): Promise<void> {
    // Con una sucursal recordada el selector permanece oculto únicamente
    // mientras comprobamos que realmente pertenece al dominio actual.
    this.showSelector = !recordada;
    this.spinnerService.show();
    try {
      const resp    = await this.tenantService.getTenant().toPromise();
      const tenants = resp?.Data ?? [];

      if (!resp || resp.Success === false) {
        this.showSelector = true;
        this.notificationService.showError(
          resp?.Message || this.textCatalog.get('couldNotLoadTenants')
        );
        this.loginForm?.get('tenant')?.disable();
        return;
      }
      if (tenants.length === 0) {
        this.showSelector = true;
        this.notificationService.showWarning(
          this.textCatalog.get('noTenantsAvailable')
        );
        this.loginForm?.get('tenant')?.disable();
        return;
      }

      this.tenantDefault = tenants as any;

      if (recordada) {
        const tenantValido = this.tenantDefault.find(
          tenant => tenant.TenantId?.trim().toLowerCase()
            === recordada.TenantId.trim().toLowerCase(),
        );

        if (tenantValido) {
          const pending = this.toPendingLogin(tenantValido);
          this.saveSucursal(pending);
          await this.loginWithTenant(pending);
          return;
        }

        // La cookie corresponde a otro host/restaurante. Se descarta para no
        // iniciar OAuth contra un realm ajeno al dominio que abrió el usuario.
        this.clearSucursal();

        // Si el dominio solo publica una sucursal, corregimos la selección y
        // continuamos sin obligar al usuario a confirmar un dato inequívoco.
        if (this.tenantDefault.length === 1) {
          const pending = this.toPendingLogin(this.tenantDefault[0]);
          this.saveSucursal(pending);
          await this.loginWithTenant(pending);
          return;
        }

        this.showSelector = true;
      }

      if (this.tenantDefault.length === 1) {
        this.loginForm?.controls['tenant']?.setValue(this.tenantDefault[0]);
      }
    } catch {
      this.showSelector = true;
      this.notificationService.showError(
        this.textCatalog.get('couldNotLoadTenantsRetry')
      );
      this.loginForm?.get('tenant')?.disable();
    } finally {
      this.spinnerService.hide();
    }
  }

  private toPendingLogin(tenant: TenantDefault): PendingLogin {
    return {
      TenantId: tenant.TenantId,
      Sucursal: tenant.Sucursal,
      Cultura: tenant.Cultura,
    };
  }
}

interface TenantDefault {
  TenantId:  string;
  Sucursal:  string;
  Cultura: string;
  ZonaHorariaId: string;
}
