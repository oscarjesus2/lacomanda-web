import { isDevMode } from '@angular/core';
import { SwRegistrationOptions } from '@angular/service-worker';

export function opcionesServiceWorker(desarrollo = isDevMode()): SwRegistrationOptions {
  return {
    // Web Push también necesita el worker al ejecutar ng serve en localhost.
    // ngsw-config.development.json evita cachear recursos durante el desarrollo.
    enabled: true,
    registrationStrategy: desarrollo ? 'registerImmediately' : 'registerWhenStable:30000',
  };
}
