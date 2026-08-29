import { Injectable } from '@angular/core';

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    mobile?: boolean;
  };
};

/**
 * Capacidades del dispositivo que afectan a integraciones locales del POS.
 * La vista responsive no se usa como criterio: redimensionar un ordenador no
 * debe convertirlo en móvil ni omitir la comprobación de QZ Tray.
 */
@Injectable({ providedIn: 'root' })
export class DeviceCapabilitiesService {
  isMobileOrTablet(): boolean {
    const navigatorInfo = window.navigator as NavigatorWithUserAgentData;
    if (navigatorInfo.userAgentData?.mobile === true) {
      return true;
    }

    const userAgent = navigatorInfo.userAgent ?? '';
    const isIPadOs = /Macintosh/i.test(userAgent)
      && navigatorInfo.maxTouchPoints > 1;

    return isIPadOs
      || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Tablet|Silk|Kindle|PlayBook/i
        .test(userAgent);
  }

  requiresLocalPrintBridge(): boolean {
    return !this.isMobileOrTablet();
  }
}
