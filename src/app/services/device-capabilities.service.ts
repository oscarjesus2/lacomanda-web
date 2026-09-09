import { Injectable } from '@angular/core';
import { DispositivoTipoEnum } from '../models/device.models';
import { TenantTextKey } from './localization/tenant-texts.en';

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    mobile?: boolean;
    platform?: string;
  };
};

/**
 * Capacidades del dispositivo que afectan a integraciones locales del POS.
 * La vista responsive no se usa como criterio: redimensionar un ordenador no
 * debe convertirlo en móvil ni omitir la comprobación de QZ Tray.
 */
@Injectable({ providedIn: 'root' })
export class DeviceCapabilitiesService {
  getDeviceType(): DispositivoTipoEnum {
    const navigatorInfo = window.navigator as NavigatorWithUserAgentData;
    const userAgent = navigatorInfo.userAgent ?? '';
    const platform = navigatorInfo.userAgentData?.platform
      || navigatorInfo.platform
      || '';
    const isIPadOs = /Macintosh/i.test(userAgent)
      && navigatorInfo.maxTouchPoints > 1;

    if (/CrOS/i.test(userAgent) || /Chrome OS/i.test(platform)) {
      return DispositivoTipoEnum.CHROMEOS;
    }
    if (isIPadOs || /iPad|iPod/i.test(userAgent)) {
      return DispositivoTipoEnum.IPAD;
    }
    if (/iPhone/i.test(userAgent)) {
      return DispositivoTipoEnum.IPHONE;
    }
    if (/Android/i.test(userAgent)) {
      return navigatorInfo.userAgentData?.mobile === true
        || /Mobile/i.test(userAgent)
        ? DispositivoTipoEnum.MOVIL_ANDROID
        : DispositivoTipoEnum.TABLET_ANDROID;
    }
    if (/Windows/i.test(userAgent) || /Win/i.test(platform)) {
      return DispositivoTipoEnum.PC_WINDOWS;
    }
    if (/Macintosh|Mac OS X/i.test(userAgent) || /Mac/i.test(platform)) {
      return DispositivoTipoEnum.MAC;
    }
    if (/Linux|X11/i.test(userAgent) || /Linux/i.test(platform)) {
      return DispositivoTipoEnum.LINUX;
    }
    return DispositivoTipoEnum.OTRO;
  }

  isMobileOrTablet(): boolean {
    return [
      DispositivoTipoEnum.TABLET_ANDROID,
      DispositivoTipoEnum.MOVIL_ANDROID,
      DispositivoTipoEnum.IPAD,
      DispositivoTipoEnum.IPHONE,
    ].includes(this.getDeviceType());
  }

  supportsLocalQz(
    type: DispositivoTipoEnum = this.getDeviceType(),
  ): boolean {
    return [
      DispositivoTipoEnum.PC_WINDOWS,
      DispositivoTipoEnum.MAC,
      DispositivoTipoEnum.LINUX,
    ].includes(type);
  }

  requiresRemotePrintAgent(
    type: DispositivoTipoEnum = this.getDeviceType(),
  ): boolean {
    return !this.supportsLocalQz(type);
  }

  requiresLocalPrintBridge(): boolean {
    return this.supportsLocalQz();
  }

  getDeviceTypeTextKey(type: DispositivoTipoEnum): TenantTextKey {
    const keys: Record<number, TenantTextKey> = {
      [DispositivoTipoEnum.PC_WINDOWS]: 'deviceTypeWindowsPc',
      [DispositivoTipoEnum.MAC]: 'deviceTypeMac',
      [DispositivoTipoEnum.LINUX]: 'deviceTypeLinuxPc',
      [DispositivoTipoEnum.TABLET_ANDROID]: 'deviceTypeAndroidTablet',
      [DispositivoTipoEnum.MOVIL_ANDROID]: 'deviceTypeAndroidPhone',
      [DispositivoTipoEnum.IPAD]: 'deviceTypeIpad',
      [DispositivoTipoEnum.IPHONE]: 'deviceTypeIphone',
      [DispositivoTipoEnum.CHROMEOS]: 'deviceTypeChromeOs',
      [DispositivoTipoEnum.TERMINAL_REMOTO]: 'deviceTypeRemoteTerminal',
      [DispositivoTipoEnum.OTRO]: 'deviceTypeOther',
    };
    return keys[type] ?? 'deviceTypeUnknown';
  }
}
