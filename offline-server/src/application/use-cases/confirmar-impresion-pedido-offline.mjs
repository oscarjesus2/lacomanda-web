import { serializarJsonLocal } from '../validators/serializar-json-local.mjs';
import { validarConfirmacionImpresionOffline } from '../validators/validar-confirmacion-impresion-offline.mjs';
import { validarUsuariosOffline } from '../validators/validar-usuarios-offline.mjs';

/** Guarda una confirmación solo después de que la estación imprima la comanda. */
export class ConfirmarImpresionPedidoOffline {
  constructor(maestros, diario, progreso = null) {
    this.maestros = maestros;
    this.diario = diario;
    this.progreso = progreso;
  }

  async ejecutar(solicitud) {
    const copia = JSON.parse(serializarJsonLocal(solicitud));
    validarConfirmacionImpresionOffline(copia);
    const previo = await this.diario.obtenerTransaccion(copia.idOperacion);
    if (previo) {
      if (previo.operacion?.tipo !== 'confirmar-impresion'
          || JSON.stringify(previo.operacion.datos.solicitud) !== JSON.stringify(copia)) {
        throw new Error('El identificador de operación ya contiene otros datos.');
      }
      return { resultado: 'existente' };
    }
    const maestros = await this.maestros.obtener();
    if (!validarUsuariosOffline(maestros).some(usuario => usuario.IdUsuario === copia.idUsuario)) {
      throw new Error('El usuario seleccionado no está disponible.');
    }
    const pedido = await this.diario.obtenerTransaccion(copia.idOperacionPedido);
    const origen = pedido?.operacion?.datos;
    if (origen?.impresionNoRequerida === true) throw new Error('El pedido no requiere impresión.');
    if (!['registrar-pedido', 'modificar-pedido'].includes(pedido?.operacion?.tipo)
        || (origen.numeroOffline ?? origen.solicitud.referenciaPedido) !== copia.numeroOffline
        || origen.solicitud.idUsuario !== copia.idUsuario || origen.solicitud.idEstacion !== copia.idEstacion) {
      throw new Error('La confirmación no corresponde a un pedido local.');
    }
    if (this.progreso) {
      await this.progreso.ejecutarExclusivo(copia.idOperacionPedido, async actual => {
        const plan = actual?.plan;
        const impresoras = new Set(plan?.trabajos?.map(trabajo => trabajo.impresora.trim().toLowerCase()));
        if (!plan || plan.idOperacion !== copia.idOperacion || plan.idEstacion !== copia.idEstacion
            || plan.idUsuario !== copia.idUsuario || plan.numeroOffline !== copia.numeroOffline
            || actual.estados.length !== plan.trabajos.length
            || actual.estados.some(estado => estado.estado !== 'aceptada')
            || impresoras.size !== copia.impresoras.length
            || copia.impresoras.some(nombre => !impresoras.has(nombre.trim().toLowerCase()))) {
          throw new Error('La impresión aún no está confirmada para todas las comandas.');
        }
        return { respuesta: true };
      });
    }
    const clave = `impresion-${copia.idOperacionPedido.toLowerCase()}`;
    const actual = await this.diario.obtenerConVersion('estado-local', clave);
    if (actual.contenido) throw new Error('El pedido ya tiene una confirmación de impresión.');
    const resultado = await this.diario.aplicar({
      id: copia.idOperacion,
      operacion: { tipo: 'confirmar-impresion', datos: { solicitud: copia } },
      cambios: [{ tipo: 'estado-local', identificador: clave, versionEsperada: actual.version,
        contenido: { numeroOffline: copia.numeroOffline, impresoras: copia.impresoras, confirmada: true } }],
    });
    return { resultado };
  }
}
