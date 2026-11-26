/** Selecciona exclusivamente los campos necesarios para operar en contingencia. */
export function normalizarUsuarioOffline(usuario) {
  if (!usuario || usuario.Activo !== true || !Number.isSafeInteger(usuario.IdUsuario)
      || usuario.IdUsuario <= 0 || typeof usuario.NombreUsuario !== 'string'
      || !usuario.NombreUsuario.trim() || !Number.isSafeInteger(usuario.IdNivel)
      || usuario.IdNivel <= 0) {
    return null;
  }
  return {
    IdUsuario: usuario.IdUsuario,
    NombreUsuario: usuario.NombreUsuario.trim(),
    NombreEmpleado: typeof usuario.NombreEmpleado === 'string' ? usuario.NombreEmpleado : null,
    IdNivel: usuario.IdNivel,
    IdEmpleado: Number.isSafeInteger(usuario.IdEmpleado) ? usuario.IdEmpleado : null,
    PuedeAplicarDescuento: usuario.PuedeAplicarDescuento === true,
    PuedeAprobarSolicitudes: usuario.PuedeAprobarSolicitudes === true,
    PuedeAbrirTurno: usuario.PuedeAbrirTurno === true,
    // La caja no puede cerrar el turno mientras existan operaciones offline.
    PuedeCerrarTurno: false,
  };
}

export function validarUsuariosOffline(estado) {
  if (!Array.isArray(estado?.maestros?.usuarios)) {
    throw new Error('Los usuarios no están preparados para el modo offline.');
  }
  return estado.maestros.usuarios.map(normalizarUsuarioOffline).filter(Boolean);
}
