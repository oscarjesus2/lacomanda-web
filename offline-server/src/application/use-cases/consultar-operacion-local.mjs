import { validarIdOperacion } from '../validators/validar-numero-pedido-offline.mjs';

/** El acuse permite resolver una respuesta perdida sin sacar el documento original de caja. */
export class ConsultarOperacionLocal {
  constructor(diario) {
    this.diario = diario;
  }

  async ejecutar(idOperacion, idUsuario) {
    validarIdOperacion(idOperacion);
    if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) throw new TypeError('El usuario consultado no es válido.');
    const registro = await this.diario.obtenerTransaccion(idOperacion);
    const operacion = registro?.operacion;
    const solicitud = operacion?.datos?.solicitud;
    if (solicitud?.idUsuario !== idUsuario || !['registrar-pedido', 'modificar-pedido', 'registrar-cobro'].includes(operacion?.tipo)) {
      return null;
    }
    const referencia = operacion.tipo === 'registrar-pedido' ? operacion.datos.numeroOffline : solicitud.referenciaPedido;
    return { registrada: true, idOperacion: registro.id, tipo: operacion.tipo, referencia };
  }
}
