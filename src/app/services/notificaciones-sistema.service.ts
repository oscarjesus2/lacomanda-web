import { Injectable } from '@angular/core';

/**
 * Puente con las notificaciones nativas del navegador/sistema operativo.
 * No sustituye la bandeja de aprobaciones: solo avisa mientras la aplicación
 * sigue abierta en otra pestaña o en segundo plano.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesSistemaService {
  get disponible(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  get permiso(): NotificationPermission | 'unsupported' {
    return this.disponible ? Notification.permission : 'unsupported';
  }

  async solicitarPermiso(): Promise<boolean> {
    if (!this.disponible) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    return (await Notification.requestPermission()) === 'granted';
  }

  async mostrarAprobacion(
    idSolicitud: number,
    titulo: string,
    detalle: string,
  ): Promise<boolean> {
    if (!this.disponible || Notification.permission !== 'granted') return false;

    // Cuando el usuario ya está mirando LaComanda, el aviso interno existente
    // es suficiente y evita mostrar el mismo mensaje dos veces.
    if (document.visibilityState === 'visible' && document.hasFocus()) return false;

    const url = `${window.location.origin}/administracion`;
    const options: NotificationOptions = {
      body: detalle,
      icon: 'assets/icons/icon-192x192.png',
      badge: 'assets/icons/icon-96x96.png',
      tag: `solicitud-autorizacion-${idSolicitud}`,
      requireInteraction: true,
      data: {
        onActionClick: {
          default: {
            operation: 'navigateLastFocusedOrOpen',
            url,
          },
        },
      },
    };

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(titulo, options);
        return true;
      }
    }

    const notification = new Notification(titulo, options);
    notification.onclick = () => {
      window.focus();
      window.location.assign(url);
      notification.close();
    };
    return true;
  }
}
