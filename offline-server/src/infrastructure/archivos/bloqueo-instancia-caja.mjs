import { createHash } from 'node:crypto';
import { realpath } from 'node:fs/promises';
import { createServer } from 'node:net';

/** Reserva una exclusión por directorio que el sistema libera al terminar el proceso. */
export async function adquirirBloqueoInstanciaCaja(directorio) {
  let ruta = await realpath(directorio);
  if (process.platform === 'win32') ruta = ruta.toLowerCase();
  const huella = createHash('sha256').update(ruta).digest();
  // Windows reserva rangos de puertos dinámicos, también en equipos con Docker.
  // Un pipe con el nombre de esta carpeta no compite con esos puertos.
  const enlace = process.platform === 'win32'
    ? { path: '\\\\.\\pipe\\lacomanda-offline-' + huella.toString('hex'), exclusive: true }
    : { port: 49152 + (huella.readUInt32BE(0) % 16384), host: '127.0.0.1', exclusive: true };
  const servidor = createServer(socket => socket.destroy());
  await new Promise((resolve, reject) => {
    servidor.once('error', reject);
    servidor.listen(enlace, () => {
      servidor.removeListener('error', reject);
      resolve();
    });
  }).catch(error => {
    if (error?.code === 'EADDRINUSE') {
      throw new Error('No se puede bloquear la carpeta de caja: ya hay una instancia o el bloqueo está ocupado.');
    }
    throw error;
  });
  return {
    cerrar: () => new Promise((resolve, reject) => servidor.close(error => error ? reject(error) : resolve())),
  };
}
