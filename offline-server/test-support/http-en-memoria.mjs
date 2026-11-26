import { request } from 'node:http';
import { duplexPair } from 'node:stream';

/** Recorre el protocolo HTTP real por dos streams, sin abrir un puerto en el equipo. */
export function clienteHttpDePrueba(servidor, direccion = '127.0.0.1') {
  return (url, opciones = {}) => new Promise((resolve, reject) => {
    const [cliente, conexion] = duplexPair();
    for (const extremo of [cliente, conexion]) {
      extremo.setTimeout = extremo.setKeepAlive = extremo.setNoDelay = () => extremo;
      extremo.destroySoon = () => extremo.end();
      extremo.remoteAddress = direccion;
    }
    servidor.emit('connection', conexion);
    const peticion = request(url, { method: opciones.method ?? 'GET',
      headers: { ...opciones.headers, Connection: 'close' }, createConnection: () => cliente }, async respuesta => {
      try {
        const partes = [];
        for await (const parte of respuesta) partes.push(parte);
        resolve(new Response(partes.length ? Buffer.concat(partes) : null,
          { status: respuesta.statusCode, headers: respuesta.headers }));
      } catch (error) { reject(error); }
    });
    peticion.once('error', reject);
    peticion.end(opciones.body);
  });
}
