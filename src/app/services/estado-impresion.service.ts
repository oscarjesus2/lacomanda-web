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

  /** El aviso previo se muestra una vez por sesion, no en cada carga. */
  private avisoPrevioMostrado = false;

  /** Ultimo estado del permiso leido, solo para diagnostico en consola. */
  private ultimoPermiso: PermissionState | 'no-expuesto' = 'no-expuesto';

  constructor(
    private readonly qz: QzTrayV224Service,
    private readonly deviceCapabilities: DeviceCapabilitiesService,
    private readonly zone: NgZone,
  ) {}

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

    if (permiso === 'prompt'
        && !desdeGestoDelUsuario
        && !await this.confirmarAvisoPrevio()) {
      return this.publicar({ disponible: false, motivo: 'permiso-pendiente' });
    }

    if (await this.qz.isQzTrayRunning()) {
      return this.publicar({ disponible: true });
    }

    // El navegador oculta el motivo real del fallo para que una web no pueda
    // escanear puertos, asi que se relee el permiso por si acaba de denegarse.
    const permisoTrasIntento = await this.leerPermisoRedLocal();
    return this.publicar({
      disponible: false,
      motivo: permisoTrasIntento === 'denied'
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
    if (this.avisoPrevioMostrado) return true;
    this.avisoPrevioMostrado = true;

    const respuesta = await Swal.fire({
      icon: 'info',
      title: 'Permiso para la impresora',
      html: `
        <p>LaComanda necesita conectarse con QZ Tray para imprimir los tickets
        de esta caja.</p>
        <p>A continuación tu navegador te pedirá
        <strong>acceso a la red local</strong>: pulsa <strong>Permitir</strong>.</p>
      `,
      confirmButtonText: 'Continuar',
      showCancelButton: true,
      cancelButtonText: 'Ahora no',
    });

    return respuesta.isConfirmed;
  }

  private publicar(estado: EstadoImpresion): EstadoImpresion {
    console.info(
      '[impresion] permiso=%s disponible=%s motivo=%s',
      this.ultimoPermiso,
      estado.disponible,
      estado.motivo ?? 'ninguno',
    );

    // QZ Tray resuelve sus promesas con RSVP, que zone.js no parchea: sin esto
    // el estado cambia pero Angular no repinta y el banner no llega a salir.
    this.zone.run(() => this.estadoSubject.next(estado));
    return estado;
  }
}
