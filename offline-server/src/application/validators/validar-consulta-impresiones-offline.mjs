/** Valida la estación y el usuario que consultan impresiones pendientes. */
export function validarConsultaImpresionesOffline(solicitud) {
  if (!solicitud || typeof solicitud !== 'object' || Array.isArray(solicitud)
      || (solicitud.todaLaEstacion !== undefined && typeof solicitud.todaLaEstacion !== 'boolean')
      || !Number.isSafeInteger(solicitud.idEstacion) || solicitud.idEstacion <= 0
      || !Number.isSafeInteger(solicitud.idUsuario) || solicitud.idUsuario <= 0) {
    throw new TypeError('La estación o el usuario no son válidos.');
  }
}
