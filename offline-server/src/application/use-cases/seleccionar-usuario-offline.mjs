import { validarUsuariosOffline } from '../validators/validar-usuarios-offline.mjs';

/** Resuelve la selección local acordada sin consultar Keycloak. */
export class SeleccionarUsuarioOffline {
  constructor(repositorio) {
    this.repositorio = repositorio;
  }

  async ejecutar(idUsuario) {
    if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
      throw new TypeError('El usuario seleccionado no es válido.');
    }
    const usuarios = validarUsuariosOffline(await this.repositorio.obtener());
    const usuario = usuarios.find(item => item.IdUsuario === idUsuario);
    if (!usuario) throw new Error('El usuario seleccionado no está disponible.');
    return usuario;
  }
}
