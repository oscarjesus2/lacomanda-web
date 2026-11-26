import { Script } from 'node:vm';

// El patrón procede del catálogo fiscal del restaurante. Se limita el tiempo, como en el backend.
const comprobarNumero = new Script('new RegExp(patron).test(numero)');

export function validarIdentidadComprador({ venta, cliente }, maestros) {
  const pais = maestros.contexto?.paisISO2;
  const factura = venta.IdTipoDocumento === 1;
  const boletaIdentificada = pais === 'PE' && venta.IdTipoDocumento === 2 && venta.Total > 700;
  const obligatoria = factura || boletaIdentificada || (pais === 'ES' && venta.IdTipoDocumento === 5 && venta.Total > 400);
  if (obligatoria && (!cliente?.IdTipoIdentidad?.trim() || !cliente?.NumeroIdentificacion?.trim() || !cliente?.RazonSocial?.trim())) {
    throw new Error('Este documento requiere la identificación del cliente.');
  }
  if (!cliente?.IdTipoIdentidad || !maestros.tiposidentidad) return;
  const tipo = maestros.tiposidentidad.find(item => item.Activo && item.IdTipoIdentidad.toUpperCase() === cliente.IdTipoIdentidad.toUpperCase());
  if (!tipo || (factura && !tipo.RequiereParaFactura)) throw new Error('El tipo de identificación no corresponde al documento.');
  const numero = cliente.NumeroIdentificacion?.trim().toUpperCase() ?? '';
  if (boletaIdentificada && tipo.IdTipoIdentidad === 'DNI' && !/^\d{8}$/.test(numero)) throw new Error('El DNI debe tener ocho dígitos.');
  if (tipo.RegexValidacion) {
    let valido = false;
    try {
      valido = comprobarNumero.runInNewContext({ patron: tipo.RegexValidacion, numero }, { timeout: 250 });
    } catch { /* Se rechaza también una configuración que la caja no pueda interpretar. */ }
    if (!valido) throw new Error('El número de identificación no corresponde al formato del documento.');
  }
}
