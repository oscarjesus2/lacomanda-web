import { isDeepStrictEqual } from 'node:util';

/** Coordina una instantánea completa obtenida de la nube con los archivos de caja. */
export class SincronizarMaestrosLocales {
  constructor(fuente, repositorio, diario, lotes = null) {
    this.fuente = fuente;
    this.repositorio = repositorio;
    this.diario = diario;
    this.lotes = lotes;
    this.cola = Promise.resolve();
  }

  ejecutar() {
    const trabajo = this.cola.then(() => this.sincronizar());
    this.cola = trabajo.catch(() => undefined);
    return trabajo;
  }

  async sincronizar() {
    if (!this.diario) {
      throw new Error('No se puede comprobar el diario local antes de sincronizar.');
    }
    // El corte debe estar confirmado ANTES del GET. Una confirmación que llegue
    // durante la consulta puede pertenecer a cambios que la nube aún no incluyó.
    const cursor = this.lotes ? (await this.lotes.obtenerCursor()).hastaSecuencia : 0;
    const actual = await this.repositorio.obtener();
    const respuesta = await this.fuente.obtenerInstantanea({
      desdeVersion: actual?.version ?? null,
    });
    if (!respuesta || !Number.isSafeInteger(respuesta.version) || respuesta.version < 0) {
      throw new Error('La nube no devolvió una versión de maestros válida.');
    }
    if (actual && respuesta.version < actual.version) {
      throw new Error('La versión de la nube es anterior a la copia local.');
    }
    return this.diario.ejecutarConSecuenciaConfirmada(cursor, async () => {
      if (actual && respuesta.version === actual.version) {
        if (cursor !== (actual.hastaSecuencia ?? 0)) throw new Error('La nube aún no publicó la copia del lote confirmado.');
        return { actualizada: false, version: actual.version };
      }
      if (actual && cursor === (actual.hastaSecuencia ?? 0) && isDeepStrictEqual(actual.maestros, respuesta.maestros)) {
        return { actualizada: false, version: actual.version };
      }
      await this.repositorio.guardar(respuesta.version, respuesta.maestros, cursor);
      return { actualizada: true, version: respuesta.version };
    });
  }
}
