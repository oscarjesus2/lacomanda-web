import { CanalVentaEnum } from 'src/app/enums/enum';
import { CajaDto } from 'src/app/models/caja.models';

/**
 * Mantiene alineada la disponibilidad de Venta directa en los puntos de
 * entrada: una caja debe estar activa, tener turno abierto y dicho canal.
 */
export function esCajaDisponibleParaVentaDirecta(caja: CajaDto): boolean {
  return caja.Activo
    && !!caja.TurnoAbierto?.IdTurno
    && (caja.IdCanalesVenta ?? []).includes(CanalVentaEnum.VENTA_DIRECTA);
}
