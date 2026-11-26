import { validarComandaOffline } from '../validators/validar-comanda-offline.mjs';

/** Prepara HTML imprimible con las secciones del ticket de comanda existente. */
export class PrepararComandaOffline {
  ejecutar(comanda) {
    validarComandaOffline(comanda);
    const destino = comanda.idCanalVenta === 4 ? 'DELIVERY'
      : comanda.idCanalVenta === 3 ? 'PARA LLEVAR'
        : [comanda.mesa, comanda.ambiente].filter(item => item?.trim()).map(item => item.trim()).join(' - ').toUpperCase() || 'PEDIDO';
    const filas = [];
    for (const linea of comanda.lineas) {
      const observacion = linea.observacion?.trim() ?? '';
      const anfitrionas = linea.anfitrionas?.trim().replace(/,+$/, '') ?? '';
      const existente = !observacion && !anfitrionas
        ? filas.find(item => !item.observacion && !item.anfitrionas && item.descripcion === linea.descripcion)
        : null;
      if (existente) {
        existente.cantidad += linea.cantidad;
        if (!Number.isFinite(existente.cantidad)) throw new TypeError('La cantidad de la comanda no es válida.');
      }
      else filas.push({ descripcion: linea.descripcion, cantidad: linea.cantidad, observacion, anfitrionas });
    }
    const encabezado = [
      ['PEDIDO', comanda.numeroPedido],
      [comanda.etiquetaMozo.toUpperCase(), comanda.mozo],
      ...(comanda.cliente?.trim() ? [['CLIENTE', comanda.cliente]] : []),
      ...(comanda.personas > 0 ? [['PERSONAS', String(comanda.personas)]] : []),
    ];
    const detalles = filas.map(item => `<tr><td class="cantidad">${escapar(formatearCantidad(item.cantidad, comanda.cultura))}</td>`
      + `<td><strong>${escapar(item.descripcion)}</strong>`
      + (item.observacion ? `<div class="nota">OBS.: ${escapar(item.observacion)}</div>` : '')
      + (item.anfitrionas ? `<div class="nota">ANFITRIONAS: ${escapar(item.anfitrionas)}</div>` : '')
      + '</td></tr>').join('');
    return '<!doctype html><html><head><meta charset="utf-8"><style>'
      + '@page{size:80mm auto;margin:3mm}body{font:8pt Arial,sans-serif;margin:0;color:#000}'
      + 'h1,h2{text-align:center;margin:2mm 0}h1{font-size:10pt}h2{font-size:13pt}'
      + 'hr{border:0;border-top:1px solid #000;margin:2mm 0}table{width:100%;border-collapse:collapse}'
      + 'td{vertical-align:top;overflow-wrap:anywhere}th{text-align:left}.cantidad{width:19%;text-align:right;padding-right:2mm}'
      + '.nota{font-weight:bold;margin-left:2mm}.pie{text-align:center}.estacion{font-weight:bold}'
      + '</style></head><body>'
      + `<h1>${escapar(comanda.area)}</h1><h2>${escapar(destino)}</h2><hr><table>`
      + encabezado.map(([nombre, valor]) => `<tr><td>${escapar(nombre)} :</td><td>${escapar(valor)}</td></tr>`).join('')
      + '</table><hr><table><thead><tr><th class="cantidad">CANT.</th><th>PRODUCTO</th></tr></thead>'
      + `<tbody>${detalles}</tbody></table><hr><div class="pie">${escapar(comanda.fechaLocal)}<br>`
      + `CAJA ${comanda.idCaja} / ${escapar(comanda.usuario)}<br><span class="estacion">${escapar(comanda.estacion)}</span>`
      + '</div></body></html>';
  }
}

function escapar(valor) {
  return String(valor).replace(/[&<>"']/g, caracter => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[caracter]);
}

function formatearCantidad(cantidad, cultura = 'es-PE') {
  return new Intl.NumberFormat(cultura, { maximumFractionDigits: 3, useGrouping: false }).format(cantidad);
}
