export function validarContextoCaja(contexto) {
  if (!contexto || typeof contexto.tenantId !== 'string' || !contexto.tenantId.trim()
      || typeof contexto.identificadorEstacion !== 'string' || !contexto.identificadorEstacion.trim()) {
    throw new TypeError('La sucursal y la estación de caja son obligatorias.');
  }
  return {
    tenantId: contexto.tenantId.trim(),
    identificadorEstacion: contexto.identificadorEstacion.trim(),
  };
}

export function comprobarContextoCaja(recibido, esperado) {
  if (typeof recibido?.tenantId !== 'string' || recibido.tenantId.toLowerCase() !== esperado.tenantId.toLowerCase()
      || recibido.identificadorEstacion !== esperado.identificadorEstacion) {
    throw new Error('Los datos no corresponden a la sucursal y estación configuradas.');
  }
}
