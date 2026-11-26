/** Conserva el estado y el mensaje de negocio de la API; los detalles técnicos se quedan en la nube. */
export async function solicitarApiNube(fetchImpl, url, opciones, accion) {
  let respuesta;
  try {
    respuesta = await fetchImpl(url, opciones);
  } catch (causa) {
    const error = new Error('No se pudo conectar con la nube para ' + accion + '.', { cause: causa });
    error.codigoHttp = causa?.name === 'TimeoutError' ? 504 : 502;
    throw error;
  }
  if (!respuesta.ok) {
    const motivo = [400, 409, 422].includes(respuesta.status) ? await leerMensajeDeNegocio(respuesta) : null;
    const mensaje = respuesta.status === 413 ? 'La petición supera el tamaño que admite la API de la nube.'
      : 'La nube rechazó la solicitud para ' + accion + ' (HTTP ' + respuesta.status + ').';
    const error = new Error(motivo || mensaje);
    error.codigoHttp = [400, 401, 403, 404, 409, 413, 422, 429].includes(respuesta.status) ? respuesta.status : 502;
    throw error;
  }
  return respuesta;
}

async function leerMensajeDeNegocio(respuesta) {
  if (!/\b(?:application\/json|application\/[\w.-]+\+json)\b/i.test(respuesta.headers?.get('content-type') ?? '')
      || !respuesta.body) return null;
  try {
    const partes = [];
    let bytes = 0;
    for await (const parte of respuesta.body) {
      bytes += parte.length;
      if (bytes > 32 * 1024) return null;
      partes.push(parte);
    }
    const datos = JSON.parse(Buffer.concat(partes).toString('utf8'));
    const campo = [datos?.Message, datos?.message, datos?.title].find(valor => typeof valor === 'string' && valor.trim());
    const linea = campo?.trim().split(/[\r\n\u2028\u2029]/, 1)[0].replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!linea || /^(?:at\s|en\s+[\w.]+\()|\b[\w.]+Exception\s*:|<[a-z!/]/i.test(linea)) return null;
    return linea.length > 240 ? linea.slice(0, 239) + '…' : linea;
  } catch {
    return null;
  }
}
