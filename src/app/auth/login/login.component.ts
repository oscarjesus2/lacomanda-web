import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
import { RUTA_REGULARIZAR_CAJA } from 'src/app/offline/ruta-regularizacion';
import { CajaOfflineSesionService } from 'src/app/offline/caja-offline-sesion.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { SesionUsuarioService } from 'src/app/services/sesion-usuario.service';
import { TenantTextCatalogService, TenantTextKey } from 'src/app/services/localization/tenant-text-catalog.service';
import {
  ProcessingIndicatorHandle,
  ProcessingIndicatorService,
} from 'src/app/services/processing-indicator.service';
import { Usuario } from 'src/app/models/usuario.models';
import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';
import { esConfiguracionPersistida } from 'src/app/components/configuracion-inicial/configuracion-persistida';

interface PendingLogin {
  TenantId: string;
  Sucursal: string;
  Cultura:  string;
  ReturnUrl?: string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  appVersion  = version;
  isSubmitting = false;
  loginValid  = true;
  loginError  = '';
  accesoDenegado = false;
  private destruido = false;
  private retornoPendiente?: string;

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
  private loginProcessing?: ProcessingIndicatorHandle;

  constructor(
    private dialog: MatDialog,
    private spinnerService: NgxSpinnerService,
    private processingIndicator: ProcessingIndicatorService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
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
    private sesionUsuario: SesionUsuarioService,
    private textCatalog: TenantTextCatalogService,
    private readonly sesionCaja: CajaOfflineSesionService,
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

    // 3. Sesión ya activa y vigente → validar también la configuración.
    //    Una sesión persistida con un token vencido no debe sacarnos del login
    //    para volver después de un 401: esa carrera dejaba el selector oculto
    //    hasta pulsar F5.
    const currentSession = this.storageService.getCurrentSession();
    if (currentSession && this.keycloakAuth.isTokenActive(currentSession.Token)) {
      this.textCatalog.setCulture(
        currentSession.Cultura ?? currentSession.CulturaTenant,
      );
      this.retornoPendiente = this.returnUrlSeguro();
      if (this.mostrarMotivoDeAcceso()) return;
      await this.abrirPuestoOnline(currentSession);
      return;
    }

    if (currentSession) {
      this.storageService.removeCurrentSession();
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

  ngOnDestroy(): void {
    this.destruido = true;
    this.finalizarIndicadorLogin();
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  initForm(): void {
    // Las credenciales ya no se recogen aquí: solo se elige el tenant (sucursal).
    this.loginForm = this.fb.group({
      tenant: [null, Validators.required],
    });
    // Antes de tener sesión, el idioma lo define la sucursal elegida.
    this.loginForm.get('tenant')?.valueChanges.subscribe(
      (tenant: TenantDefault | null) => this.aplicarCulturaSucursal(tenant?.Cultura),
    );
  }

  /** Aplica la cultura de la sucursal; si no tiene, se mantiene la del navegador. */
  private aplicarCulturaSucursal(cultura: string | null | undefined): void {
    if (cultura?.trim()) {
      this.textCatalog.setCulture(cultura);
    }
  }

  // ── Login (redirect a Keycloak) ─────────────────────────────────────────────

  async login(): Promise<void> {
    if (this.loginForm.invalid || this.isSubmitting) return;

    const { tenant } = this.loginForm.getRawValue();
    const pending: PendingLogin = {
      TenantId: tenant.TenantId,
      Sucursal: tenant.Sucursal,
      Cultura:  tenant.Cultura,
      ReturnUrl: this.returnUrlSeguro(),
    };

    this.aplicarCulturaSucursal(pending.Cultura);
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

    let pending: PendingLogin;
    try {
      pending = JSON.parse(pendingRaw) as PendingLogin;
    } catch {
      localStorage.removeItem(LoginComponent.PENDING_LOGIN_KEY);
      return false;
    }

    this.aplicarCulturaSucursal(pending.Cultura);
    this.spinnerService.show();
    this.iniciarIndicadorLogin();

    try {
      const tokens = await this.keycloak.completeLogin(pending.TenantId);
      localStorage.removeItem(LoginComponent.PENDING_LOGIN_KEY);

      if (!tokens) {
        this.finalizarIndicadorLogin();
        await this.loadTenants();
        return true;
      }

      // Keycloak ya retiró el código de la barra de direcciones con replaceState.
      // Alinea el router para que, si luego se cancela la apertura del puesto,
      // restaure esa misma dirección y conserve los parámetros propios de la app.
      const { pathname, search, hash } = window.location;
      const rutaLimpia = pathname + search + hash;
      if (!this.destruido && this.router.url !== rutaLimpia) {
        await this.router.navigateByUrl(rutaLimpia, { replaceUrl: true }).catch(() => false);
      }
      if (this.destruido) return true;

      this.actualizarIndicadorLogin(
        this.textCatalog.get('preparingSessionTitle'),
        this.textCatalog.get('preparingSessionMessage'),
        'verified_user',
      );
      await this.completarSesion(tokens, pending);
      return true;
    } catch (error) {
      localStorage.removeItem(LoginComponent.PENDING_LOGIN_KEY);
      this.finalizarIndicadorLogin();

      // El interceptor ya eliminó la sesión operativa y está navegando a la
      // vista específica de suscripción. No reiniciar la carga de tenants:
      // hacerlo volvería a lanzar Keycloak y ocultaría el aviso al cliente.
      if (this.isSubscriptionAccessError(error)) {
        return true;
      }

      this.loginValid = false;
      this.notificationService.showError('No se pudo completar el inicio de sesión. Inténtalo de nuevo.');
      await this.loadTenants();
      return true;
    }
  }

  private isSubscriptionAccessError(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse) || error.status !== 402) {
      return false;
    }

    const body = error.error as { ErrorCode?: string; errorCode?: string } | null;
    const errorCode = body?.ErrorCode || body?.errorCode || '';

    return [
      'SUBSCRIPTION_PAYMENT_REQUIRED',
      'SUBSCRIPTION_EXPIRED',
      'SUBSCRIPTION_CANCELLED',
      'SUBSCRIPTION_NOT_ACTIVE',
    ].includes(errorCode);
  }

  /**
   * Construye la sesión con los tokens de Keycloak y ejecuta la orquestación
   * post-login (roles, estación, cultura, config y navegación).
   */
  private async completarSesion(
    tokens: { token: string; refreshToken: string; idToken?: string },
    pending: PendingLogin,
  ): Promise<void> {
    const { token, refreshToken } = tokens;
    // Los mensajes previos a la sesión (p. ej. rechazos) usan el idioma de la sucursal.
    this.aplicarCulturaSucursal(pending.Cultura);
    const roles   = this.keycloakAuth.getRoles(token);
    const usuario = this.keycloakAuth.buildUsuarioFromToken(token);

    const isAdmin = roles.includes('admin');
    const isGerente = roles.includes('gerente');
    const isCaja  = roles.includes('caja');
    const isMozo  = roles.includes('mozo');
    const hasRole = isGerente || isAdmin || isCaja || isMozo;

    if (!hasRole) {
      this.finalizarIndicadorLogin();
      this.notificationService.showWarning(this.textCatalog.get('noBusinessRole'));
      void this.rechazarSesionKeycloak(tokens, pending);
      return;
    }

    if (!this.CurrentIP && !isAdmin && !isGerente) {
      this.finalizarIndicadorLogin();
      void Swal.fire({
        title: this.textCatalog.get('stationNotConfigured'),
        text: this.textCatalog.get('stationIdentifierMissing'),
        icon: 'warning',
        confirmButtonText: this.textCatalog.get('accept')
      }).then(() => this.rechazarSesionKeycloak(tokens, pending));
      return;
    }

    if (!this.CurrentIP) usuario.TipoCompu = EstacionTipoEnum.ADMINISTRADOR;
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
    this.actualizarIndicadorLogin(
      this.textCatalog.get('preparingSessionTitle'),
      this.textCatalog.get('preparingSessionMessage'),
      'manage_accounts',
    );
    try {
      await this.sesionUsuario.registrarAhora();
    } catch (error) {
      this.storageService.removeCurrentSession();
      throw error;
    }
    this.inicializarCulturaUsuario(session, usuario);
    this.retornoPendiente = this.returnUrlSeguro(pending.ReturnUrl);
    await this.abrirPuestoOnline(session);
  }

  private async abrirPuestoOnline(session: Session): Promise<void> {
    this.isSubmitting = true;
    this.loginError = '';
    this.accesoDenegado = false;
    const retorno = this.retornoPendiente;
    const destinoAdministrativo = retorno && retorno !== RUTA_REGULARIZAR_CAJA ? retorno : '/dashboard';
    let mensajeDeError: TenantTextKey = 'onlineConfigurationUnavailable';
    try {
      if (!this.CurrentIP) {
        await this.ensureConfigThenNavigate(destinoAdministrativo);
        return;
      }
      this.actualizarIndicadorLogin(
        this.textCatalog.get('detectingStationTitle'),
        this.textCatalog.get('detectingStationMessage'),
        'computer',
      );
      mensajeDeError = 'couldNotLoadStations';
      const respuesta = await firstValueFrom(this.estacionService.getAll());
      if (this.destruido) return;
      if (this.storageService.getCurrentSession() !== session) {
        this.loginError = this.textCatalog.get('onlineWorkspaceUnavailable');
        return;
      }
      if (!Array.isArray(respuesta?.Data) || respuesta.Success === false) {
        this.loginError = this.textCatalog.get('couldNotLoadStations');
        return;
      }

      const identificador = this.CurrentIP.trim().toLowerCase();
      const estacion = respuesta.Data.find(e => typeof e?.IdentificadorUnico === 'string'
        && e.IdentificadorUnico.trim().toLowerCase() === identificador);
      if (estacion) {
        session.User.TipoCompu = estacion.Tipo;
        this.storageService.setCurrentSession(session);
      }
      switch (estacion?.Tipo) {
        case EstacionTipoEnum.CAJA:
          await this.navegarTrasLogin(this.destinoCajaTrasLogin('/caja', estacion.Tipo, retorno));
          break;
        case EstacionTipoEnum.MOZO:
          await this.navegarTrasLogin('/mozo');
          break;
        case EstacionTipoEnum.COCINA:
          await this.navegarTrasLogin('/preparacion');
          break;
        default:
          mensajeDeError = 'onlineConfigurationUnavailable';
          await this.ensureConfigThenNavigate(destinoAdministrativo);
      }
    } catch (error) {
      this.mostrarFalloDelPuesto(mensajeDeError, error);
    } finally {
      this.isSubmitting = false;
      this.finalizarIndicadorLogin();
    }
  }

  /**
   * Un usuario autenticado en Keycloak pero no admitido en este dispositivo
   * deja abierta su sesión SSO. Sin cerrarla, el siguiente "Continuar" (o la
   * sucursal recordada) vuelve a entrar silenciosamente con ese mismo usuario
   * y el administrador nunca llega a ver el formulario de Keycloak.
   */
  private async rechazarSesionKeycloak(
    tokens: { refreshToken: string; idToken?: string },
    pending: PendingLogin,
  ): Promise<void> {
    this.finalizarIndicadorLogin();
    this.storageService.removeCurrentSession();
    try {
      await firstValueFrom(
        this.keycloakAuth.logout(tokens.refreshToken, pending.TenantId),
      );
    } catch {
      if (tokens.idToken) {
        // Respaldo: cierre por redirección; Keycloak devuelve al login.
        this.keycloak.logoutRedirect(pending.TenantId, tokens.idToken);
        return;
      }
    }
    this.loadTenants();
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
    if (!esConfiguracionPersistida(cfg)) return false;
    return !!cfg.RazonSocial && !!cfg.NombreComercial && !!cfg.Direccion &&
           !!cfg.Telefono && !!cfg.NumeroIdentificacion &&
           cfg.IdTipoIdentidad !== null && cfg.IdTipoIdentidad !== undefined;
  }

  private async ensureConfigThenNavigate(targetUrl: string): Promise<void> {
    this.spinnerService.show();
    this.actualizarIndicadorLogin(
      this.textCatalog.get('loadingRestaurantTitle'),
      this.textCatalog.get('loadingRestaurantMessage'),
      'storefront',
    );
    const config = await firstValueFrom(this.configService.get());
    if (this.destruido) return;
    if (!this.isConfigValid(config)) {
      this.finalizarIndicadorLogin();
      const dialogRef = this.dialog.open(ConfiguracionInicialComponent, {
        width: '920px',
        disableClose: true,
        data: { modoInicial: true },
      });
      const result = await firstValueFrom(dialogRef.afterClosed());
      if (this.destruido) return;
      if (result !== true && result !== 'saved') {
        await this.elegirSucursal();
        return;
      }
    }
    await this.navegarTrasLogin(targetUrl);
  }

  private destinoCajaTrasLogin(habitual: string, tipo?: EstacionTipoEnum, retorno?: string): string {
    return tipo === EstacionTipoEnum.CAJA && this.returnUrlSeguro(retorno) === RUTA_REGULARIZAR_CAJA
      ? RUTA_REGULARIZAR_CAJA : habitual;
  }

  /** Conserva el destino del aviso sin permitir redirecciones externas. */
  private returnUrlSeguro(valor?: string | null): string | undefined {
    const candidato = valor
      ?? this.route.snapshot.queryParamMap.get('returnUrl');
    return candidato?.startsWith('/') && !candidato.startsWith('//')
      ? candidato
      : undefined;
  }

  private mostrarMotivoDeAcceso(): boolean {
    const motivo = this.route.snapshot.queryParamMap.get('acceso');
    if (motivo !== 'licencia-no-disponible' && motivo !== 'sin-licencia') return false;
    this.accesoDenegado = motivo === 'sin-licencia';
    this.loginError = this.textCatalog.get(this.accesoDenegado ? 'onlineWorkspaceNotLicensed' : 'onlineLicenseUnavailable');
    return true;
  }

  async reintentarOnline(): Promise<void> {
    if (this.isSubmitting) return;
    const session = this.storageService.getCurrentSession();
    if (!session || !this.keycloakAuth.isTokenActive(session.Token)) {
      await this.elegirSucursal();
      return;
    }
    const destino = this.returnUrlSeguro();
    if (destino && this.route.snapshot.queryParamMap.get('acceso') === 'licencia-no-disponible') {
      this.isSubmitting = true;
      this.loginError = '';
      try {
        await this.navegarTrasLogin(destino);
      } finally {
        this.isSubmitting = false;
      }
      return;
    }
    await this.abrirPuestoOnline(session);
  }

  async elegirSucursal(): Promise<void> {
    this.loginError = '';
    this.loginValid = true;
    this.isSubmitting = false;
    this.retornoPendiente = undefined;
    this.clearSucursal();
    this.storageService.logout(false);
    await this.loadTenants();
  }

  private iniciarIndicadorLogin(): void {
    const options = {
      title: this.textCatalog.get('validatingLoginTitle'),
      message: this.textCatalog.get('validatingLoginMessage'),
      hint: this.textCatalog.get('loginProcessingHint'),
      icon: 'login',
    };

    if (this.loginProcessing) {
      this.loginProcessing.update(options);
      return;
    }

    this.loginProcessing = this.processingIndicator.begin(options);
  }

  private actualizarIndicadorLogin(
    title: string,
    message: string,
    icon: string,
  ): void {
    if (!this.loginProcessing) {
      this.loginProcessing = this.processingIndicator.begin({
        title,
        message,
        hint: this.textCatalog.get('loginProcessingHint'),
        icon,
      });
      return;
    }

    this.loginProcessing.update({ title, message, icon });
  }

  private finalizarIndicadorLogin(): void {
    this.loginProcessing?.close();
    this.loginProcessing = undefined;
    this.spinnerService.hide();
  }

  private async navegarTrasLogin(targetUrl: string): Promise<void> {
    this.actualizarIndicadorLogin(
      this.textCatalog.get('openingWorkspaceTitle'),
      this.textCatalog.get('openingWorkspaceMessage'),
      'space_dashboard',
    );

    let destino = targetUrl;
    try {
      destino = await this.sesionCaja.destinoTrasLogin(targetUrl);
      if (this.destruido) return;
      const abierto = await this.router.navigateByUrl(destino, { replaceUrl: true });
      if (!this.destruido && (!abierto || /^\/(iniciar-sesion|inicio)(?:[?#]|$)/.test(this.router.url))) {
        if (!this.mostrarMotivoDeAcceso()) this.loginError = this.textCatalog.get('onlineWorkspaceUnavailable');
      }
    } catch (error) {
      this.mostrarFalloDelPuesto(destino === RUTA_REGULARIZAR_CAJA
        ? 'onlineReconciliationUnavailable' : 'onlineWorkspaceUnavailable', error);
    } finally {
      this.finalizarIndicadorLogin();
    }
  }

  private mostrarFalloDelPuesto(clave: TenantTextKey, error: unknown): void {
    if (this.destruido || this.isSubscriptionAccessError(error)) return;
    const codigo = error instanceof HttpErrorResponse && error.status > 0
      ? `HTTP ${error.status}`
      : error instanceof Error ? error.message.match(/\bNG\d{4,5}\b/)?.[0] : undefined;
    const mensaje = this.textCatalog.get(clave);
    this.loginError = codigo ? `${mensaje} (${codigo})` : mensaje;
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
          this.aplicarCulturaSucursal(pending.Cultura);
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
          this.aplicarCulturaSucursal(pending.Cultura);
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
      ReturnUrl: this.returnUrlSeguro(),
    };
  }
}

interface TenantDefault {
  TenantId:  string;
  Sucursal:  string;
  Cultura: string;
  ZonaHorariaId: string;
}
