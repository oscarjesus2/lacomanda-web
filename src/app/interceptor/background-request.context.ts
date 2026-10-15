import { HttpContextToken } from '@angular/common/http';

/** Los errores de Cesia se muestran en su panel; la autenticación se sigue validando. */
export const CONSULTA_CESIA_EN_SEGUNDO_PLANO = new HttpContextToken(() => false);
