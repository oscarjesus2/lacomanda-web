import { execFile } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import { win32 } from 'node:path';
import { promisify } from 'node:util';

const ejecutar = promisify(execFile);

/** Rechaza unidades de red y enlaces a ellas antes de crear archivos de caja. */
export async function validarDirectorioFisicoCaja(directorio, opciones = {}) {
  const plataforma = opciones.plataforma ?? process.platform;
  if (plataforma !== 'win32') return;
  const resolver = opciones.realpath ?? realpath;
  const obtenerTipo = opciones.obtenerTipoUnidad ?? obtenerTipoUnidadWindows;
  const unidadConfigurada = extraerUnidad(directorio);
  let existente = directorio;
  let rutaReal;
  while (true) {
    try {
      rutaReal = await resolver(existente);
      break;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      const padre = win32.dirname(existente);
      if (padre === existente) throw new Error('No se encontró la unidad local configurada para caja.');
      existente = padre;
    }
  }
  const unidadReal = extraerUnidad(rutaReal);
  for (const unidad of new Set([unidadConfigurada, unidadReal])) {
    let tipo;
    try {
      tipo = await obtenerTipo(unidad);
    } catch {
      throw new Error('No se pudo comprobar si la unidad de caja es local.');
    }
    if (tipo !== 'Fixed') throw new Error('Los datos de caja deben guardarse en un disco local fijo.');
  }
}

function extraerUnidad(ruta) {
  const unidad = win32.parse(ruta).root;
  if (!/^[a-z]:\\$/i.test(unidad)) throw new Error('Los datos de caja deben guardarse en un disco local fijo.');
  return unidad.toUpperCase();
}

async function obtenerTipoUnidadWindows(unidad) {
  // La letra está restringida a una unidad local antes de incluirla en el script.
  const script = `[System.IO.DriveInfo]::new('${unidad}').DriveType.ToString()`;
  const { stdout } = await ejecutar('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    windowsHide: true, timeout: 10_000, maxBuffer: 4096,
  });
  return stdout.trim();
}
