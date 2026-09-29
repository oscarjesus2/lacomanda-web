import { Configuracion } from 'src/app/models/configuracion.models';

/**
 * El GET de configuración devuelve una propuesta con IdConfig=0 cuando el
 * negocio aún no completó el alta. Solo un identificador persistido permite
 * abrir el mantenimiento y ejecutar PUT /config.
 */
export function esConfiguracionPersistida(
  configuracion: Pick<Configuracion, 'IdConfig'> | null | undefined,
): boolean {
  return Number.isInteger(configuracion?.IdConfig)
    && (configuracion?.IdConfig ?? 0) > 0;
}
