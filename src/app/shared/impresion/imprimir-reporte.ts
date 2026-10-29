import Swal from 'sweetalert2';

export type FilaImpresion = Record<string, string | number | null | undefined>;

export interface ReporteImprimible {
  titulo: string;
  filas: FilaImpresion[];
  detalles?: string[];
  graficos?: { titulo: string; barras: { etiqueta: string; texto: string; ancho: number }[] }[];
}

/** Abre una vista imprimible con todas las filas filtradas, sin depender del paginador. */
export function imprimirReporte(reporte: ReporteImprimible): void {
  if (!reporte.filas.length) {
    Swal.fire('Sin registros', 'No hay resultados para imprimir.', 'info');
    return;
  }
  const ventana = window.open('', '_blank');
  if (!ventana) {
    Swal.fire('Ventana bloqueada', 'Permita ventanas emergentes para imprimir.', 'info');
    return;
  }
  const escapar = (valor: unknown): string => String(valor ?? '—')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const columnas = Object.keys(reporte.filas[0]);
  const cabecera = columnas.map(columna => `<th>${escapar(columna)}</th>`).join('');
  const cuerpo = reporte.filas.map(fila => `<tr>${columnas.map(columna => {
    const valor = fila[columna];
    const texto = typeof valor === 'number' ? valor.toLocaleString('es-PE', { maximumFractionDigits: 3 }) : valor;
    return `<td${typeof valor === 'number' ? ' class="numero"' : ''}>${escapar(texto)}</td>`;
  }).join('')}</tr>`).join('');
  const detalles = (reporte.detalles ?? []).filter(Boolean)
    .map(detalle => `<p>${escapar(detalle)}</p>`).join('');
  const graficos = (reporte.graficos ?? []).filter(grafico => grafico.barras.length).map(grafico =>
    `<section class="grafico"><h2>${escapar(grafico.titulo)}</h2>${grafico.barras.map(barra =>
      `<div class="barra-fila"><span>${escapar(barra.etiqueta)}</span><div class="barra-pista"><div class="barra-color" style="width:${Math.max(0, Math.min(100, Number(barra.ancho) || 0))}%"></div></div><b>${escapar(barra.texto)}</b></div>`).join('')}</section>`).join('');
  ventana.document.open();
  ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapar(reporte.titulo)}</title>
    <style>@page{size:landscape;margin:12mm}body{font:10px Arial,sans-serif;color:#28211d}h1{font-size:18px;color:#a5210d;margin:0 0 8px}p{margin:4px 0;line-height:1.35}table{border-collapse:collapse;width:100%;margin-top:12px;table-layout:auto}thead{display:table-header-group}tr{break-inside:avoid}th,td{border:1px solid #ddd;padding:5px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#f8eee9;color:#8e210e}.numero{text-align:right;font-variant-numeric:tabular-nums}.grafico{break-inside:avoid;margin:16px 0}.grafico h2{font-size:13px}.barra-fila{display:grid;grid-template-columns:1fr 2fr auto;gap:8px;align-items:center;margin:5px 0}.barra-pista{height:8px;background:#eee}.barra-color{height:8px;background:#b33113;print-color-adjust:exact;-webkit-print-color-adjust:exact}</style></head>
    <body><h1>${escapar(reporte.titulo)}</h1>${detalles}${graficos}<p>Resultados: ${reporte.filas.length}</p><table><thead><tr>${cabecera}</tr></thead><tbody>${cuerpo}</tbody></table></body></html>`);
  ventana.document.close();
  ventana.focus();
  ventana.print();
}

export function fechaReporte(fecha: string | null | undefined): string {
  if (!fecha) return '—';
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (soloFecha) return `${soloFecha[3]}/${soloFecha[2]}/${soloFecha[1]}`;
  const valor = new Date(fecha);
  return Number.isNaN(valor.getTime()) ? fecha : valor.toLocaleDateString();
}
