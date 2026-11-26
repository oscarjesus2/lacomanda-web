const MAESTROS_CONSULTABLES = new Set(['productos', 'mesas', 'cajas', 'turnos', 'areas', 'descuentos',
  'monedas', 'documentos', 'tarjetas', 'socios', 'clientesdelivery', 'tipospago', 'tiposidentidad']);

export function esMaestroConsultable(nombre) {
  return MAESTROS_CONSULTABLES.has(nombre);
}

/** Consulta los datos preparados en caja sin acceder a la nube. */
export class ObtenerMaestroLocal {
  constructor(repositorio, diario = null) {
    this.repositorio = repositorio;
    this.diario = diario;
  }

  async ejecutar(nombre) {
    if (!esMaestroConsultable(nombre)) return null;
    const estado = await this.repositorio.obtener();
    if (!estado || !Object.hasOwn(estado.maestros, nombre)) return null;
    if (nombre === 'mesas' && this.diario) {
      const mesasLocales = await this.diario.obtener('estado-local', 'mesas', estado.hastaSecuencia);
      if (mesasLocales) {
        if (!Array.isArray(mesasLocales.datos)) throw new Error('El estado local de mesas no es válido.');
        return { version: estado.version, datos: mesasLocales.datos };
      }
    }
    return { version: estado.version, datos: estado.maestros[nombre] };
  }
}
