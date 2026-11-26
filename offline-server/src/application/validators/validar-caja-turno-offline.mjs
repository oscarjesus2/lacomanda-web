/** Exige una caja y un turno abiertos presentes en la copia local. */
export function validarCajaTurnoOffline(maestros, idCaja, idTurno = null) {
  if (!Array.isArray(maestros?.cajas) || !Array.isArray(maestros?.turnos)) {
    throw new Error('Las cajas y turnos no están preparados para el modo offline.');
  }
  if (!maestros.cajas.some(caja => caja.IdCaja === idCaja)) {
    throw new Error('La caja no está configurada en la copia local.');
  }
  if (!maestros.turnos.some(turno => turno.IdCaja === idCaja && turno.Estado === 1
      && (idTurno === null || turno.IdTurno === idTurno))) {
    throw new Error('La caja no tiene un turno abierto en la copia local.');
  }
}
