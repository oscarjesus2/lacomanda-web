import { validarUsuariosOffline } from '../validators/validar-usuarios-offline.mjs';

/** Lista los usuarios activos que estaban preparados en caja antes del corte. */
export class ListarUsuariosOffline {
  constructor(repositorio) {
    this.repositorio = repositorio;
  }

  async ejecutar() {
    return validarUsuariosOffline(await this.repositorio.obtener());
  }
}
