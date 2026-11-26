/** Valida los datos ya resueltos para una comanda de un área. */
export function validarComandaOffline(comanda) {
  if (!comanda || typeof comanda !== 'object'
      || typeof comanda.area !== 'string' || !comanda.area.trim()
      || typeof comanda.numeroPedido !== 'string' || !comanda.numeroPedido.trim()
      || ![2, 3, 4].includes(comanda.idCanalVenta)
      || typeof comanda.fechaLocal !== 'string' || !comanda.fechaLocal.trim()
      || !Number.isSafeInteger(comanda.idCaja) || comanda.idCaja <= 0
      || typeof comanda.usuario !== 'string' || !comanda.usuario.trim()
      || typeof comanda.estacion !== 'string' || !comanda.estacion.trim()
      || typeof comanda.etiquetaMozo !== 'string' || !comanda.etiquetaMozo.trim()
      || typeof comanda.mozo !== 'string' || !comanda.mozo.trim()
      || !Array.isArray(comanda.lineas) || comanda.lineas.length === 0) {
    throw new TypeError('Los datos de la comanda no son válidos.');
  }
  for (const nombre of ['mesa', 'ambiente', 'cliente']) {
    if (comanda[nombre] !== undefined && typeof comanda[nombre] !== 'string') {
      throw new TypeError('Los datos de la comanda no son válidos.');
    }
  }
  if (comanda.personas !== undefined && (!Number.isSafeInteger(comanda.personas) || comanda.personas < 0)) {
    throw new TypeError('El número de personas no es válido.');
  }
  if (comanda.cultura !== undefined) {
    try {
      if (typeof comanda.cultura !== 'string' || !comanda.cultura.trim()) throw new Error();
      new Intl.NumberFormat(comanda.cultura);
    } catch {
      throw new TypeError('La cultura de la comanda no es válida.');
    }
  }
  for (const linea of comanda.lineas) {
    if (!linea || typeof linea.descripcion !== 'string' || !linea.descripcion.trim()
        || !Number.isFinite(linea.cantidad) || linea.cantidad <= 0
        || (linea.observacion !== undefined && typeof linea.observacion !== 'string')
        || (linea.anfitrionas !== undefined && typeof linea.anfitrionas !== 'string')) {
      throw new TypeError('Una línea de la comanda no es válida.');
    }
  }
}
