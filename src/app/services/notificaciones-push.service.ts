import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { EstacionTipoEnum, NivelUsuarioEnum } from '../enums/enum';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { DeviceIdentifierService } from './device-identifier.service';
import { StorageService } from './storage.service';

interface ConfiguracionNotificacionesPush {
  Disponible: boolean;
  ClavePublica?: string | null;
  EstacionAdministrativaVinculada: boolean;
  SuscripcionPersistentePermitida: boolean;
}

export interface EstadoNotificacionesPush {
  persistentesPermitidas: boolean;
  suscritas: boolean;
}

/**
 * Gestiona el canal que sigue funcionando con la aplicación cerrada. El
 * backend vuelve a validar que el identificador pertenece a una estación de
 * administración antes de registrar y antes de enviar cada notificación.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesPushService {
  private readonly basePath = `${environment.apiUrl}/notificaciones-push`;

  constructor(
    private readonly http: HttpClient,
    private readonly swPush: SwPush,
    private readonly storage: StorageService,
    private readonly deviceIdentifier: DeviceIdentifierService,
  ) {}

  async obtenerEstado(): Promise<EstadoNotificacionesPush> {
    if (!this.esCandidatoLocal() || !this.swPush.isEnabled) {
      return { persistentesPermitidas: false, suscritas: false };
    }

    const configuracion = await this.obtenerConfiguracion();
    const suscripcion = await firstValueFrom(this.swPush.subscription);
    return {
      persistentesPermitidas:
        configuracion.SuscripcionPersistentePermitida
        && !!configuracion.ClavePublica,
      suscritas: !!suscripcion,
    };
  }

  /** Registra otra vez una suscripción existente tras cada inicio de sesión. */
  async sincronizarExistente(): Promise<EstadoNotificacionesPush> {
    const estado = await this.obtenerEstado();
    if (!estado.persistentesPermitidas || !estado.suscritas) return estado;

    const suscripcion = await firstValueFrom(this.swPush.subscription);
    if (suscripcion) await this.registrar(suscripcion);
    return estado;
  }

  async activar(): Promise<boolean> {
    if (!this.esCandidatoLocal() || !this.swPush.isEnabled) return false;

    const configuracion = await this.obtenerConfiguracion();
    if (!configuracion.SuscripcionPersistentePermitida
        || !configuracion.ClavePublica) {
      return false;
    }

    let suscripcion = await firstValueFrom(this.swPush.subscription);
    if (!suscripcion) {
      suscripcion = await this.swPush.requestSubscription({
        serverPublicKey: configuracion.ClavePublica,
      });
    }

    await this.registrar(suscripcion);
    return true;
  }

  private esCandidatoLocal(): boolean {
    const usuario = this.storage.getCurrentUser();
    return usuario?.IdNivel === NivelUsuarioEnum.Administrador
      && usuario.TipoCompu === EstacionTipoEnum.ADMINISTRADOR
      && !!this.deviceIdentifier.getIdentifier();
  }

  private async obtenerConfiguracion(): Promise<ConfiguracionNotificacionesPush> {
    const response = await firstValueFrom(this.http.get<
      ApiResponse<ConfiguracionNotificacionesPush>
    >(`${this.basePath}/configuracion`, {
      params: {
        identificadorEstacion: this.deviceIdentifier.getIdentifier(),
      },
    }));
    return response.Data;
  }

  private async registrar(suscripcion: PushSubscription): Promise<void> {
    const json = suscripcion.toJSON();
    const keys = json.keys;
    if (!json.endpoint || !keys?.p256dh || !keys.auth) {
      throw new Error('La suscripción Web Push no contiene sus claves.');
    }

    await firstValueFrom(this.http.post<ApiResponse<boolean>>(
      `${this.basePath}/suscripciones`,
      {
        IdentificadorEstacion: this.deviceIdentifier.getIdentifier(),
        Endpoint: json.endpoint,
        P256dh: keys.p256dh,
        Auth: keys.auth,
      },
    ));
  }
}
