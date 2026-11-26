import { HttpContextToken } from '@angular/common/http';

/** El consumidor presenta el error. Se mantienen los controles de sesión y suscripción. */
export const ERROR_GESTIONADO_POR_CONSUMIDOR = new HttpContextToken(() => false);
