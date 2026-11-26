export function validarVersionMaestros(solicitud, instantanea) {
  if (solicitud.versionMaestros !== undefined && solicitud.versionMaestros !== instantanea?.version) {
    throw new Error('La copia de caja cambió. Actualice los productos y las cuentas antes de continuar.');
  }
}
