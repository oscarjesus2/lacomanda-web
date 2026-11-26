import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const ejecutar = promisify(execFile);
const proyecto = fileURLToPath(new URL('../', import.meta.url));
const versionNode = '24.22.1';
const urlNode = `https://nodejs.org/download/release/v${versionNode}/win-x64/node.exe`;
// Primer digest: SHASUMS256.txt de nodejs.org. El segundo corresponde al
// ejecutable x64 firmado por OpenJS Foundation distribuido con Visual Studio.
const hashesNode = [
  'd702daa815eabbff763c7d3808e235cf031cf2ca70211b56847bc72f51e240e5',
  '3321d33c097725f4e1982e3a42aee26a969a1f57166e29f37ddbd906d9567361',
];
const hashLicencia = '5888dbb9a1d2b18f2c3e6c5f6af1b39de658372b402a0577b002777f14c62ace';
const nombreZip = 'caja-windows-x64.zip';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function leerSiExiste(ruta) {
  try { return await readFile(ruta); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return null;
  }
}

async function publicar(ruta, datos) {
  const temporal = ruta + '.' + randomUUID() + '.tmp';
  try {
    await writeFile(temporal, datos, { flag: 'wx' });
    await rename(temporal, ruta);
  } finally {
    await rm(temporal, { force: true });
  }
}

export function verificarRuntime(bytes) {
  if (!hashesNode.includes(sha256(bytes))) {
    throw new Error(`El SHA-256 no coincide con Node.js ${versionNode} para Windows x64.`);
  }
}

async function obtenerRuntime(copiaLocal) {
  const cache = join(proyecto, 'offline-server', '.cache');
  const archivo = join(cache, `node-${versionNode}-win-x64.exe`);
  const guardado = !copiaLocal && await leerSiExiste(archivo);
  if (guardado) {
    verificarRuntime(guardado);
    return guardado;
  }
  let bytes = copiaLocal && await readFile(copiaLocal);
  if (!bytes) {
    const respuesta = await fetch(urlNode, { signal: AbortSignal.timeout(180000) });
    if (!respuesta.ok) throw new Error(`No se pudo obtener Node.js para caja (HTTP ${respuesta.status}).`);
    bytes = Buffer.from(await respuesta.arrayBuffer());
  }
  verificarRuntime(bytes);
  await mkdir(cache, { recursive: true });
  await publicar(archivo, bytes);
  return bytes;
}

async function modulos(directorio, prefijo, entradas) {
  for (const item of await readdir(directorio, { withFileTypes: true })) {
    const ruta = join(directorio, item.name);
    const nombre = prefijo + '/' + item.name;
    if (item.isDirectory()) await modulos(ruta, nombre, entradas);
    else if (item.isFile() && item.name.endsWith('.mjs')) entradas.push([nombre, await readFile(ruta)]);
  }
}

export async function leerFuentesCaja() {
  const servicio = join(proyecto, 'offline-server');
  const licencia = await readFile(join(servicio, 'windows/NODE-LICENSE.txt'), 'utf8');
  const licenciaNormalizada = Buffer.from(licencia.replace(/\r\n/g, '\n'));
  if (sha256(licenciaNormalizada) !== hashLicencia) throw new Error('La licencia de Node.js no corresponde a la versión fijada.');
  const entradas = [
    ['install.ps1', await readFile(join(servicio, 'windows/install.ps1'))],
    ['windows/iniciar.mjs', await readFile(join(servicio, 'windows/iniciar.mjs'))],
    ['runtime/LICENSE', licenciaNormalizada],
  ];
  await modulos(join(servicio, 'src'), 'src', entradas);
  entradas.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  return entradas;
}

export async function empaquetarCaja({ salida = join(proyecto, 'src/assets/caja-windows'), copiaLocal = process.env.LACOMANDA_NODE_WINDOWS } = {}) {
  const entradas = await leerFuentesCaja();
  const fuentes = sha256(JSON.stringify([versionNode, hashesNode, entradas.map(([n, bytes]) => [n, sha256(bytes)])]));
  await mkdir(salida, { recursive: true });
  const rutaZip = join(salida, nombreZip);
  const rutaManifiesto = join(salida, 'manifiesto.json');
  const previo = await leerSiExiste(rutaManifiesto);
  if (previo && !copiaLocal) {
    const manifiesto = JSON.parse(previo);
    if (manifiesto.fuentes === fuentes) {
      const zip = await leerSiExiste(rutaZip);
      if (zip && sha256(zip) === manifiesto.sha256) return manifiesto;
    }
  }

  entradas.push(['runtime/node.exe', await obtenerRuntime(copiaLocal)]);
  const zip = await crearZip(entradas);
  const manifiesto = { sha256: sha256(zip), fuentes, node: versionNode };
  await publicar(rutaZip, zip);
  await publicar(rutaManifiesto, JSON.stringify(manifiesto) + '\n');
  return manifiesto;
}

export async function crearZip(entradas) {
  const temporal = await mkdtemp(join(tmpdir(), 'lacomanda-paquete-'));
  try {
    for (const [nombre, bytes] of entradas) {
      const ruta = join(temporal, nombre);
      await mkdir(dirname(ruta), { recursive: true });
      await writeFile(ruta, bytes);
    }
    const archivo = join(temporal, nombreZip);
    const contenido = ['install.ps1', 'runtime', 'src', 'windows'];
    if (process.platform === 'win32') {
      await ejecutar('tar.exe', ['-acf', archivo, ...contenido], { cwd: temporal, windowsHide: true });
    } else {
      await ejecutar('python3', ['-m', 'zipfile', '-c', archivo, ...contenido], { cwd: temporal });
    }
    return await readFile(archivo);
  } finally {
    await rm(temporal, { recursive: true, force: true });
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const resultado = await empaquetarCaja();
  console.log(`Instalador de caja listo (Node ${resultado.node}, SHA-256 ${resultado.sha256}).`);
}
