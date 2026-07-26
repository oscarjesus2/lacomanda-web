import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { KeycloakAuthService } from 'src/app/services/auth/keycloak-auth.service';
import { StorageService } from 'src/app/services/storage.service';
import { EstacionService } from 'src/app/services/estacion.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { NotificationService } from 'src/app/services/notification.service';
import { Session } from 'src/app/models/session.models';
import { TenantService } from 'src/app/services/tenant.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogMCantComponent } from 'src/app/components/dialog-mcant/dialog-mcant.component';
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

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  appVersion  = version;
  isSubmitting = false;
  hide        = true;
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

  constructor(
    private dialog: MatDialog,
    private spinnerService: NgxSpinnerService,
    private fb: FormBuilder,
    private router: Router,
    private keycloakAuth: KeycloakAuthService,
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

  ngOnInit(): void {
    this.headerService.hideHeader();
    this.checkIfIos();
    this.loadTenants();

    const clientUUID = this.cookieService.get('clientUUID');
    if (clientUUID) {
      this.identifierExists = true;
      this.CurrentIP = clientUUID;
    }

    this.initForm();

    const currentSession = this.storageService.getCurrentSession();
    if (currentSession) {
      this.textCatalog.setCulture(
        currentSession.Cultura ?? currentSession.CulturaTenant,
      );
      const route = this.keycloakAuth.getTargetRoute(currentSession.Token);
      this.router.navigateByUrl(route);
    }
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  initForm(): void {
    this.loginForm = this.fb.group({
      tenant:   [null, Validators.required],
      username: ['',   Validators.required],
      password: ['',   Validators.required],
    });
  }

  // ── Táctil ────────────────────────────────────────────────────────────────

  openPasswordDialog(): void {
    if (this.isSubmitting) return;
    const dialogRef = this.dialog.open(DialogMCantComponent, {
      width: '350px',
      data: { title: 'Ingresar Contraseña', hideNumber: true, decimalActive: false }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result?.value) {
        this.loginForm.controls['password'].setValue(result.value);
        this.login();
      }
    });
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  login(): void {
    if (this.loginForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.loginValid   = true;
    this.spinnerService.show();
    this.loginForm.disable({ emitEvent: false });

    const { tenant, username, password } = this.loginForm.getRawValue();

    this.keycloakAuth.login(username, password, tenant.TenantId).subscribe({
      next: (tokenResp) => {
        const token   = tokenResp.access_token;
        const roles   = this.keycloakAuth.getRoles(token);
        const usuario = this.keycloakAuth.buildUsuarioFromToken(token);

        const isAdmin = roles.includes('admin');
        const isCaja  = roles.includes('caja');
        const isMozo  = roles.includes('mozo');
        const hasRole = isAdmin || isCaja || isMozo;

        if (!hasRole) {
          this.isSubmitting = false;
          this.loginForm.enable();
          this.spinnerService.hide();
          this.notificationService.showWarning('El usuario no tiene un rol de negocio asignado en Keycloak.');
          return;
        }

        if (this.CurrentIP) {
          // Guardar sesión con token ANTES de llamar a la API,
          // para que el interceptor pueda adjuntar el Authorization header.
          const session = new Session(
            token,
            tokenResp.refresh_token,
            usuario,
            this.CurrentIP,
            tenant.TenantId,
            tenant.Sucursal,
            tenant.Cultura,
          );
          this.storageService.setCurrentSession(session);
          this.inicializarCulturaUsuario(session, usuario);

          // La estación manda sobre el rol para determinar la ruta
          this.estacionService.getAll().subscribe({
            next: (estResp) => {
              this.isSubmitting = false;
              this.loginForm.enable();
              this.spinnerService.hide();

              const estaciones = estResp?.Data ?? [];
              const estacion   = estaciones.find(e => e.IdentificadorUnico === this.CurrentIP);

              if (!estacion) {
                // Sin estación asociada → dashboard
                this.loginForm.reset();
                this.ensureConfigThenNavigate('/dashboard');
                return;
              }

              // Actualizar TipoCompu en sesión con el valor real de la estación
              usuario.TipoCompu = estacion.Tipo;
              session.User      = usuario;
              this.storageService.setCurrentSession(session);
              this.loginForm.reset();

              // La estación determina la ruta — sin importar el rol del usuario
              if (estacion.Tipo === EstacionTipoEnum.CAJA) {
                this.router.navigateByUrl('/caja');
              } else if (estacion.Tipo === EstacionTipoEnum.MOZO) {
                this.router.navigateByUrl('/mozo');
              } else {
                this.ensureConfigThenNavigate('/dashboard');
              }
            },
            error: () => {
              this.isSubmitting = false;
              this.loginForm.enable();
              this.spinnerService.hide();
              this.storageService.removeCurrentSession();
              this.notificationService.showError('No se pudo obtener la lista de estaciones.');
            }
          });

        } else {
          // Sin cookie de estación: solo admin puede continuar (hacia dashboard)
          if (!isAdmin) {
            this.isSubmitting = false;
            this.loginForm.enable();
            this.spinnerService.hide();
            Swal.fire({
              title: 'Estación no configurada',
              text: 'Este dispositivo no tiene un identificador de estación. Contactá al administrador.',
              icon: 'warning',
              confirmButtonText: 'OK'
            });
            return;
          }

          usuario.TipoCompu = EstacionTipoEnum.ADMINISTRADOR;
          const session = new Session(
            token,
            tokenResp.refresh_token,
            usuario,
            this.CurrentIP,
            tenant.TenantId,
            tenant.Sucursal,
            tenant.Cultura,
          );
          this.storageService.setCurrentSession(session);
          this.inicializarCulturaUsuario(session, usuario);

          this.isSubmitting = false;
          this.loginForm.enable();
          this.spinnerService.hide();
          this.loginForm.reset();
          this.ensureConfigThenNavigate('/dashboard');
        }
      },
      error: () => {
        this.isSubmitting = false;
        this.loginForm.enable();
        this.spinnerService.hide();
        this.loginValid = false;
      }
    });
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
    this.forgotUsername = this.loginForm?.controls['username']?.value ?? '';
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
      this.forgotError = 'Seleccioná una sucursal e ingresá tu usuario.';
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
      alert('Para instalar la aplicación en iOS, abre el menú de compartir y selecciona "Agregar a la pantalla de inicio".');
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
        this.notificationService.showError(resp?.Message || 'No se pudo obtener la lista de tenants.');
        this.loginForm?.get('tenant')?.disable();
        return;
      }
      if (tenants.length === 0) {
        this.notificationService.showWarning('No hay tenants disponibles. Contacta al administrador.');
        this.loginForm?.get('tenant')?.disable();
        return;
      }

      this.tenantDefault = tenants as any;
      if (this.tenantDefault.length === 1) {
        this.loginForm?.controls['tenant']?.setValue(this.tenantDefault[0]);
        setTimeout(() => (document.getElementById('username') as HTMLInputElement)?.focus(), 120);
      }
    } catch {
      this.notificationService.showError('No se pudieron cargar los tenants. Inténtalo nuevamente.');
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
