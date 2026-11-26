import { validarNuevoPedidoOffline } from '../validators/validar-nuevo-pedido-offline.mjs';
import { validarVersionMaestros } from '../validators/validar-version-maestros.mjs';
import { serializarJsonLocal } from '../validators/serializar-json-local.mjs';
import { GenerarNumeroPedidoOffline } from './generar-numero-pedido-offline.mjs';
import { planificarImpresion, recuperarProgreso } from './planificar-impresion-pedido-offline.mjs';

/** Registra un pedido nuevo y la ocupación de su mesa en el mismo diario. */
export class RegistrarNuevoPedidoOffline {
  constructor(maestros, diario, progreso = null) {
    this.maestros = maestros;
    this.diario = diario;
    this.generador = new GenerarNumeroPedidoOffline();
    this.progreso = progreso;
  }

  async ejecutar(solicitud) {
    const copia = JSON.parse(serializarJsonLocal(solicitud));
    const numero = this.generador.ejecutar(copia.idEstacion, copia.idOperacion);
    const existente = await this.diario.obtenerTransaccion(copia.idOperacion);
    if (existente) {
      if (existente.operacion?.tipo !== 'registrar-pedido'
          || JSON.stringify(existente.operacion.datos.solicitud) !== JSON.stringify(copia)) {
        throw new Error('El identificador de operación ya contiene otros datos.');
      }
      await this.diario.aplicar(existente);
      const plan = existente.cambios.find(item => item.identificador === 'plan-' + copia.idOperacion.toLowerCase())?.contenido;
      if (plan && this.progreso) await recuperarProgreso(this.progreso, plan);
      return { numeroOffline: numero, resultado: 'existente', ...(plan ? { plan } : {}) };
    }
    const instantanea = await this.maestros.obtener();
    if (!instantanea) throw new Error('Los maestros locales no están preparados.');
    validarVersionMaestros(copia, instantanea);
    const estadoMesas = await this.diario.obtenerConVersion('estado-local', 'mesas', instantanea.hastaSecuencia);
    const mesas = estadoMesas.contenido?.datos ?? instantanea.maestros.mesas;
    const importe = validarNuevoPedidoOffline(copia, instantanea, mesas);
    const cambios = [{
      tipo: 'pedidos', identificador: numero, versionEsperada: 0,
      // El servidor asigna el estado activo a los detalles nuevos, aunque el
      // DTO de entrada no lo traiga; la copia local debe reflejarlo también.
      contenido: { ...copia.pedido, Estado: 1, NroPedidoOffline: numero, Total: importe, Importe: importe, Dscto: 0, NroCuenta: 1,
        ListaPedidoDet: copia.pedido.ListaPedidoDet.map((detalle, indice) => ({ ...detalle, Item: indice + 1, Estado: 1 })) },
    }];
    if (copia.pedido.IdCanalVenta === 2) {
      cambios.push({
        tipo: 'estado-local', identificador: 'mesas', versionEsperada: estadoMesas.version,
        contenido: { datos: mesas.map(mesa => mesa.IdEspacio === copia.pedido.IdEspacio
          ? { ...mesa, Ocupado: 1 } : mesa) },
      });
    }
    const impresion = this.progreso
      ? planificarImpresion(copia, instantanea.maestros, numero, copia.pedido, copia.pedido.ListaPedidoDet)
      : undefined;
    if (impresion) cambios.push(impresion);
    const resultado = await this.diario.aplicar({
      id: copia.idOperacion,
      operacion: { tipo: 'registrar-pedido', datos: { solicitud: copia, numeroOffline: numero,
        ...(impresion === null ? { impresionNoRequerida: true } : {}) } },
      cambios,
    }, async () => {
      if ((await this.maestros.obtener())?.version !== instantanea.version) {
        throw new Error('Los maestros cambiaron; actualice los datos antes de registrar el pedido.');
      }
    }, instantanea.hastaSecuencia);
    if (impresion) await recuperarProgreso(this.progreso, impresion.contenido);
    return { numeroOffline: numero, resultado, ...(impresion ? { plan: impresion.contenido } : {}) };
  }
}
