import { randomUUID } from 'node:crypto';
import { validarContextoCaja } from '../validators/validar-contexto-caja.mjs';
import { validarOperacionesRegularizables } from '../validators/validar-operaciones-regularizables.mjs';
import { validarConfirmacionLote } from '../validators/validar-confirmacion-lote.mjs';

/** Prepara y reintenta un solo lote sin descartar información antes del acuse. */
export class RegularizarLoteLocal {
  constructor(diario, lotes, nube, contexto) {
    this.diario = diario;
    this.lotes = lotes;
    this.nube = nube;
    this.contexto = validarContextoCaja(contexto);
  }

  ejecutar() {
    return this.lotes.ejecutarExclusivo(async () => {
      let lote = await this.lotes.obtenerActivo();
      if (!lote) {
        const cursor = await this.lotes.obtenerCursor();
        // El contrato de un lote activo (también el formato antiguo) ya está fijado en disco.
        const operaciones = await this.diario.listarDesde(cursor.hastaSecuencia, { soloReferencias: true });
        if (operaciones.length === 0) return { enviado: false };
        validarOperacionesRegularizables(operaciones);
        lote = {
          id: randomUUID(),
          contexto: this.contexto,
          desdeSecuencia: cursor.hastaSecuencia + 1,
          hastaSecuencia: operaciones[operaciones.length - 1].secuencia,
          operaciones,
        };
        await this.lotes.guardarActivo(lote);
      }

      validarOperacionesRegularizables(lote.operaciones);

      if (lote.contexto.tenantId !== this.contexto.tenantId
          || lote.contexto.identificadorEstacion !== this.contexto.identificadorEstacion) {
        throw new Error('El lote pendiente pertenece a otra sucursal o estación.');
      }

      const respuesta = await this.nube.regularizar(lote);
      validarConfirmacionLote(lote, respuesta);
      await this.lotes.confirmar(lote, respuesta);
      return { enviado: true, id: lote.id, operaciones: lote.operaciones.length };
    });
  }
}
