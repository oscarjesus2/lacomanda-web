import { serializarJsonLocal } from '../validators/serializar-json-local.mjs';
import { validarProgresoImpresionOffline } from '../validators/validar-progreso-impresion-offline.mjs';
import { validarUsuariosOffline } from '../validators/validar-usuarios-offline.mjs';

/** Guarda cada envío antes de imprimir y conserva los resultados tras reinicios. */
export class GestionarProgresoImpresionOffline {
  constructor(maestros, diario, repositorio) {
    this.maestros = maestros;
    this.diario = diario;
    this.repositorio = repositorio;
  }

  async ejecutar(datos) {
    const solicitud = JSON.parse(serializarJsonLocal(datos));
    validarProgresoImpresionOffline(solicitud);
    return this.repositorio.ejecutarExclusivo(solicitud.idOperacionPedido, async actual => {
      if (solicitud.accion === 'crear') {
        const pedido = await this.diario.obtenerTransaccion(solicitud.idOperacionPedido);
        const usuarios = validarUsuariosOffline(await this.maestros.obtener());
        const referencia = pedido?.operacion?.datos?.numeroOffline ?? pedido?.operacion?.datos?.solicitud?.referenciaPedido;
        if (pedido?.operacion?.datos?.impresionNoRequerida === true) {
          throw new Error('El pedido no requiere impresión.');
        }
        if (!['registrar-pedido', 'modificar-pedido'].includes(pedido?.operacion?.tipo)
            || referencia !== solicitud.numeroOffline || pedido.operacion.datos.solicitud.idUsuario !== solicitud.idUsuario
            || pedido.operacion.datos.solicitud.idEstacion !== solicitud.idEstacion
            || !usuarios.some(usuario => usuario.IdUsuario === solicitud.idUsuario)) {
          throw new Error('La impresión no corresponde a un pedido y usuario disponibles.');
        }
        const plan = { idOperacion: solicitud.idOperacion, idOperacionPedido: solicitud.idOperacionPedido,
          idEstacion: solicitud.idEstacion, idUsuario: solicitud.idUsuario, numeroOffline: solicitud.numeroOffline,
          trabajos: solicitud.trabajos.map(trabajo => ({ impresora: trabajo.impresora.trim(), datos: trabajo.datos })) };
        const original = pedido.cambios.find(item => item.identificador === 'plan-' + solicitud.idOperacionPedido.toLowerCase());
        if (!original && pedido.operacion.tipo === 'modificar-pedido') throw new Error('La modificación no tiene una comanda asociada.');
        if (original && JSON.stringify(original.contenido) !== JSON.stringify(plan)) throw new Error('El pedido ya tiene otro plan de impresión.');
        if (actual) {
          if (JSON.stringify(actual.plan) !== JSON.stringify(plan)) throw new Error('El pedido ya tiene otro plan de impresión.');
          return { respuesta: actual };
        }
        const creado = { plan, estados: plan.trabajos.map(() => ({ estado: 'pendiente', idIntento: null, historial: [] })) };
        return { guardar: creado, respuesta: creado };
      }
      if (!actual || actual.plan.idEstacion !== solicitud.idEstacion || actual.plan.idUsuario !== solicitud.idUsuario) {
        throw new Error('No se encontró el plan de impresión de esta estación.');
      }
      if (solicitud.accion === 'consultar') return { respuesta: actual };
      const estado = actual.estados[solicitud.indice];
      if (!estado || !Array.isArray(estado.historial)) throw new Error('La comanda no existe o su progreso es inválido.');
      if (solicitud.accion === 'iniciar') {
        if (estado.estado !== 'pendiente') throw new Error('La comanda ya fue iniciada; revise su impresión.');
        estado.estado = 'enviando';
        estado.idIntento = solicitud.idIntento;
      } else if (solicitud.accion === 'aceptar') {
        if (estado.estado === 'aceptada' && estado.idIntento === solicitud.idIntento) return { respuesta: actual };
        if (estado.estado !== 'enviando' || estado.idIntento !== solicitud.idIntento) {
          throw new Error('El intento de impresión no coincide.');
        }
        estado.estado = 'aceptada';
      } else {
        if (estado.estado !== 'enviando' || estado.idIntento !== solicitud.idIntento) {
          throw new Error('La comanda no tiene un resultado pendiente de revisión.');
        }
        estado.estado = solicitud.decision === 'impresa' ? 'aceptada' : 'pendiente';
        if (estado.estado === 'pendiente') estado.idIntento = null;
      }
      estado.historial.push({ accion: solicitud.accion, idIntento: solicitud.idIntento,
        ...(solicitud.accion === 'resolver' ? { decision: solicitud.decision } : {}), fechaUtc: new Date().toISOString() });
      return { guardar: actual, respuesta: actual };
    });
  }
}
