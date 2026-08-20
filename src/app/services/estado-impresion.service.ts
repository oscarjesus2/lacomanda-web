import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import Swal from 'sweetalert2';
import { DeviceCapabilitiesService } from './device-capabilities.service';
import { QzTrayV224Service } from './qz-tray-v224.service';

/** Por que esta estacion no puede imprimir por QZ Tray. */
export type MotivoSinImpresion =
  /** El navegador tiene denegado el acceso a la red local para este sitio. */
  | 'permiso-denegado'
  /** El usuario aplazo el permiso; el navegador aun puede volver a pedirlo. */
  | 'permiso-pendiente'
  /** QZ Tray no responde: no instalado, cerrado o certificado sin confianza. */
  | 'qz-no-disponible';

export interface EstadoImpresion {
  disponible: boolean;
  motivo?: MotivoSinImpresion;
  /**
   * false cuando QZ Tray responde pero aun no confia en este sitio. Se puede
   * imprimir, pero QZ pedira confirmacion en el escritorio cada vez, asi que
   * no es un fallo: es un aviso de que falta el paso del certificado.
   */
  certificadoConfigurado?: boolean;
}

/**
 * Disponibilidad de la impresion local en esta estacion.
 *
 * Un permiso denegado solo impide imprimir por QZ Tray: la caja sigue
 * operativa y los documentos salen por el dialogo del navegador. Por eso el
 * estado se publica para avisar, nunca para bloquear la venta.
 */
@Injectable({ providedIn: 'root' })
export class EstadoImpresionService {
  /** Permiso de red local; todavia no esta en los tipos de lib.dom. */
  private static readonly permisoRedLocal = {
    name: 'local-network-access',
  } as unknown as PermissionDescriptor;

  private readonly estadoSubject = new BehaviorSubject<EstadoImpresion>({
    disponible: true,
  });
  readonly estado$ = this.estadoSubject.asObservable();

  /** Documentos esperando a que vuelva la impresora. */
  readonly pendientes$ = this.qz.pendientes$;

  /** Clave del aplazamiento; se guarda por equipo, no por pestaña. */
  private static readonly claveAviso = 'lacomanda.impresion.avisoAplazado';

  /**
   * Si el usuario aplazo el aviso, no se le vuelve a interrumpir en este
   * equipo. Antes era una propiedad en memoria y el servicio es de raiz, asi
   * que se reiniciaba en cada recarga: aplazarlo no servia de nada.
   */
  private get avisoPrevioAplazado(): boolean {
    try {
      return localStorage.getItem(EstadoImpresionService.claveAviso) === '1';
    } catch {
      return false;
    }
  }

  private set avisoPrevioAplazado(valor: boolean) {
    try {
      localStorage.setItem(EstadoImpresionService.claveAviso, valor ? '1' : '0');
    } catch {
      // Modo privado o almacenamiento lleno: se pierde el aplazamiento, que es
      // preferible a romper la comprobacion de impresion.
    }
  }

  /** Ultimo estado del permiso leido, solo para diagnostico en consola. */
  private ultimoPermiso: PermissionState | 'no-expuesto' = 'no-expuesto';

  constructor(
    private readonly qz: QzTrayV224Service,
    private readonly deviceCapabilities: DeviceCapabilitiesService,
    private readonly zone: NgZone,
  ) {
    // Una impresion rechazada por QZ Tray es la prueba mas fiable de que falta
    // autorizar el certificado, y llega mucho despues de la comprobacion
    // inicial. Sin esto los "Request blocked" se quedaban solo en la consola.
    this.qz.confianza$.subscribe(confia => {
      if (confia === null || confia === this.estado.certificadoConfigurado) return;

      // Si QZ Tray ha llegado a responder es que esta accesible, asi que el
      // motivo anterior (si lo habia) ya no describe la situacion.
      this.publicar({ disponible: true, certificadoConfigurado: confia });
    });
  }

  get estado(): EstadoImpresion {
    return this.estadoSubject.value;
  }

  get disponible(): boolean {
    return this.estadoSubject.value.disponible;
  }

  /**
   * Comprueba si se puede imprimir por QZ Tray y publica el estado.
   *
   * Cuando el navegador esta a punto de pedir el permiso de red local, primero
   * se le explica al usuario que va a aceptar. Denegar es permanente: Chrome
   * lo recuerda entre reinicios y no vuelve a preguntar, asi que no conviene
   * gastar ese dialogo sin contexto.
   *
   * @param desdeGestoDelUsuario true cuando la comprobacion nace de un clic;
   * entonces el aviso previo sobra porque el usuario ya la ha pedido el.
   */
  async comprobar(desdeGestoDelUsuario = false): Promise<EstadoImpresion> {
    if (!this.deviceCapabilities.requiresLocalPrintBridge()) {
      return this.publicar({ disponible: true });
    }

    const permiso = await this.leerPermisoRedLocal();
    if (permiso === 'denied') {
      // Conectar no serviria: el navegador ya no reabre su dialogo por si solo.
      return this.publicar({ disponible: false, motivo: 'permiso-denegado' });
    }

    // Se intenta conectar antes de explicar nada.
    //
    // Antes se avisaba en cuanto el permiso estaba en 'prompt', dando por hecho
    // que el navegador iba a pedirlo. Pero 'prompt' solo significa "sin
    // decidir", y cuando el sitio y QZ Tray estan los dos en localhost el
    // permiso de red local ni siquiera hace falta: Chrome lo exige al alcanzar
    // una direccion local desde un origen publico, no de local a local. Asi que
    // el permiso se quedaba en 'prompt' para siempre, el aviso prometia un
    // dialogo del navegador que no llegaba nunca, y reaparecia en cada carga
    // aunque la impresion funcionase perfectamente.
    if (await this.qz.isQzTrayRunning()) {
      // Al recuperarse se olvida el aplazamiento: si mas adelante vuelve a
      // fallar, el usuario merece enterarse otra vez.
      this.avisoPrevioAplazado = false;

      // Conectar no basta: QZ Tray acepta el WebSocket aunque no confie en el
      // sitio, y sin certificado cada impresion pide confirmacion a mano.
      return this.publicar({
        disponible: true,
        certificadoConfigurado: await this.qz.tieneCertificadoConfigurado(),
      });
    }

    // El navegador oculta el motivo real del fallo para que una web no pueda
    // escanear puertos, asi que se relee el permiso por si acaba de denegarse.
    const permisoTrasIntento = await this.leerPermisoRedLocal();
    if (permisoTrasIntento === 'denied') {
      return this.publicar({ disponible: false, motivo: 'permiso-denegado' });
    }

    // Aqui si merece la pena explicarse: no se ha podido conectar y el permiso
    // sigue sin decidirse, de modo que puede ser la causa. El clic del usuario
    // aporta ademas el gesto que Chrome necesita para mostrar su dialogo.
    if (!desdeGestoDelUsuario && !await this.confirmarAvisoPrevio()) {
      return this.publicar({ disponible: false, motivo: 'permiso-pendiente' });
    }

    if (await this.qz.isQzTrayRunning()) {
      return this.publicar({
        disponible: true,
        certificadoConfigurado: await this.qz.tieneCertificadoConfigurado(),
      });
    }

    return this.publicar({
      disponible: false,
      motivo: await this.leerPermisoRedLocal() === 'denied'
        ? 'permiso-denegado'
        : 'qz-no-disponible',
    });
  }

  /**
   * Estado del permiso de red local, o null si el navegador no lo expone: o es
   * una version sin ese permiso (conectar a localhost es libre) o no lo publica
   * en la Permissions API. En ambos casos solo queda intentar la conexion.
   */
  private async leerPermisoRedLocal(): Promise<PermissionState | null> {
    try {
      const permisos = window.navigator.permissions;
      if (!permisos?.query) return null;

      const resultado = await permisos.query(
        EstadoImpresionService.permisoRedLocal,
      );
      this.ultimoPermiso = resultado.state;
      return resultado.state;
    } catch {
      this.ultimoPermiso = 'no-expuesto';
      return null;
    }
  }

  /**
   * Explica el permiso antes de que lo pida el navegador. El clic del usuario
   * es ademas el gesto que hace que Chrome muestre su dialogo de forma fiable.
   */
  private async confirmarAvisoPrevio(): Promise<boolean> {
    // Aunque lo aplace, no se le vuelve a interrumpir: el banner de la caja
    // queda como via de entrada para reintentarlo cuando le venga bien.
    if (this.avisoPrevioAplazado) return true;
    this.avisoPrevioAplazado = true;

    const respuesta = await Swal.fire({
      icon: 'warning',
      title: 'No se pudo conectar con la impresora',
      html: `
        <p>LaComanda no ha podido conectarse con QZ Tray para imprimir los
        tickets de esta caja.</p>
        <p>Comprueba que <strong>QZ Tray esté abierto</strong> en este equipo.
        Si tu navegador pide <strong>acceso a la red local</strong>,
        pulsa <strong>Permitir</strong>.</p>
      `,
      confirmButtonText: 'Reintentar',
      showCancelButton: true,
      cancelButtonText: 'Ahora no',
    });

    return respuesta.isConfirmed;
  }

  private publicar(estado: EstadoImpresion): EstadoImpresion {
    console.info(
      '[impresion] permiso=%s disponible=%s motivo=%s certificado=%s',
      this.ultimoPermiso,
      estado.disponible,
      estado.motivo ?? 'ninguno',
      estado.certificadoConfigurado ?? 'sin-comprobar',
    );

    // QZ Tray resuelve sus promesas con RSVP, que zone.js no parchea: sin esto
    // el estado cambia pero Angular no repinta y el banner no llega a salir.
    this.zone.run(() => this.estadoSubject.next(estado));
    return estado;
  }
}
