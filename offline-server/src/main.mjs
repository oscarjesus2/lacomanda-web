import { leerConfiguracionCaja } from './application/validators/validar-configuracion-caja.mjs';
import { validarDirectorioFisicoCaja } from './infrastructure/archivos/validar-directorio-fisico-caja.mjs';
import { adquirirBloqueoInstanciaCaja } from './infrastructure/archivos/bloqueo-instancia-caja.mjs';
import { mkdir, readFile } from 'node:fs/promises';
import { crearServidorLocal } from './interfaces/http/crear-servidor-local.mjs';
import { prepararCajaLocal } from './preparar-caja-local.mjs';

const configuracion = leerConfiguracionCaja(process.env);
const { directorio, lan } = configuracion;
const tls = lan ? { cert: await readFile(lan.cert), key: await readFile(lan.key) } : null;
await validarDirectorioFisicoCaja(directorio);
await mkdir(directorio, { recursive: true });
const bloqueo = await adquirirBloqueoInstanciaCaja(directorio);
const servidores = [];
try {
  await iniciar();
} catch (error) {
  await detener();
  throw error;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, detener);

async function iniciar() {
  const dependencias = await prepararCajaLocal(configuracion);
  await escuchar(crearServidorLocal(dependencias), configuracion.hostLocal, configuracion.puerto);
  if (lan) await escuchar(crearServidorLocal({ ...dependencias, tls }), lan.host, lan.puerto);
  console.log('Servicio de caja iniciado. Consulte /api/estado para conocer las operaciones disponibles.');
}

async function escuchar(servidor, host, port) {
  await new Promise((resolve, reject) => {
    servidor.once('error', reject);
    servidor.listen({ host, port }, () => {
      servidor.removeListener('error', reject);
      resolve();
    });
  });
  servidores.push(servidor);
}

async function detener() {
  for (const signal of ['SIGINT', 'SIGTERM']) process.removeListener(signal, detener);
  await Promise.all(servidores.splice(0).map(servidor => new Promise(resolve => servidor.close(resolve))));
  await bloqueo.cerrar();
}
