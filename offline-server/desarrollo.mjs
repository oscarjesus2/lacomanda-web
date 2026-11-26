import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { pathToFileURL } from 'node:url';

// Lanzador de desarrollo en el equipo de caja. La configuración de producción
// continúa entrando por src/main.mjs y sus variables obligatorias.
export async function configurarDesarrollo(env, argumentos, preguntar) {
  const tenant = (argumentos[0] || env.LACOMANDA_OFFLINE_TENANT || await preguntar('Sucursal (tenant): ')).trim();
  const estacion = (argumentos[1] || env.LACOMANDA_OFFLINE_ESTACION || await preguntar('Identificador de la estación de caja: ')).trim();
  if (!tenant || !estacion) throw new Error('Introduce la sucursal y el identificador de la estación registrada.');
  const id = createHash('sha256').update(JSON.stringify([tenant.toLowerCase(), estacion])).digest('hex');
  env.LACOMANDA_OFFLINE_DATA_DIR ??= join(env.LOCALAPPDATA || homedir(), 'LaComanda', 'desarrollo', id);
  env.LACOMANDA_OFFLINE_TENANT = tenant;
  env.LACOMANDA_OFFLINE_ESTACION = estacion;
  env.LACOMANDA_OFFLINE_ORIGINS ??= 'http://localhost:4200,http://127.0.0.1:4200';
  env.LACOMANDA_OFFLINE_API_URL ??= 'https://localhost:7285/api';
  env.LACOMANDA_OFFLINE_ENABLED ??= 'true';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    await configurarDesarrollo(process.env, process.argv.slice(2), pregunta => terminal.question(pregunta));
  } finally {
    terminal.close();
  }
  await import('./src/main.mjs');
}
