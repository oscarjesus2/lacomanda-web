import { serializarJsonLocal } from '../validators/serializar-json-local.mjs';
import { validarCobroPendienteOffline } from '../validators/validar-cobro-pendiente-offline.mjs';
import { validarVersionMaestros } from '../validators/validar-version-maestros.mjs';
import { obtenerEstadoPrevio } from '../validators/validar-modificacion-pedido-offline.mjs';
import { ObtenerPedidoLocal } from './obtener-pedido-local.mjs';
import { ListarPedidosLocales } from './listar-pedidos-locales.mjs';

/** Conserva el cobro y libera la mesa sin emitir ni numerar un comprobante. */
export class RegistrarCobroPendienteOffline {
  constructor(maestros, diario) {
    this.maestros = maestros;
    this.diario = diario;
    this.obtenerPedido = new ObtenerPedidoLocal(maestros, diario);
    this.listarPedidos = new ListarPedidosLocales(maestros, diario);
  }

  async ejecutar(solicitud) {
    const copia = JSON.parse(serializarJsonLocal(solicitud));
    if (typeof copia.referenciaPedido !== 'string'
        || !Number.isSafeInteger(copia.versionPedido) || copia.versionPedido < 0) {
      throw new TypeError('La referencia y versión del pedido son obligatorias.');
    }
    const anterior = await this.diario.obtenerTransaccion(copia.idOperacion);
    if (anterior) {
      if (anterior.operacion?.tipo !== 'registrar-cobro'
          || JSON.stringify(anterior.operacion.datos.solicitud) !== JSON.stringify(copia)) {
        throw new Error('El identificador de operación ya contiene otros datos.');
      }
      await this.diario.aplicar(anterior);
      return { referencia: copia.idOperacion, resultado: 'existente' };
    }
    const instantanea = await this.maestros.obtener();
    if (!instantanea) throw new Error('Los maestros locales no están preparados.');
    validarVersionMaestros(copia, instantanea);
    const pedidoActual = await this.obtenerPedido.ejecutar(copia.referenciaPedido);
    if (pedidoActual.version !== copia.versionPedido) throw new Error('El pedido ha cambiado; actualice los datos antes de cobrar.');
    validarCobroPendienteOffline(copia, instantanea, pedidoActual.contenido);
    const pedido = pedidoActual.contenido;
    const previo = instantanea.maestros.contexto || pedido.ListaPedidoDet.every(detalle => detalle.Item && detalle.Producto?.IdProducto)
      ? obtenerEstadoPrevio(pedido) : null;
    const cambios = [
      { tipo: 'pedidos', identificador: copia.referenciaPedido, versionEsperada: copia.versionPedido,
        contenido: { ...pedido, Estado: 2, ListaPedidoDet: pedido.ListaPedidoDet.map(detalle =>
          detalle.Estado === 1 ? { ...detalle, Estado: 2 } : detalle) } },
      { tipo: 'comprobantes-pendientes', identificador: copia.idOperacion, versionEsperada: 0,
        contenido: { referenciaPedido: copia.referenciaPedido, documento: copia.documento,
          correoComprobante: copia.correoComprobante ?? null, idEstacion: copia.idEstacion, idUsuario: copia.idUsuario } },
    ];
    if (pedido.IdCanalVenta === 2) {
      if (!Array.isArray(instantanea.maestros.pedidos)) {
        throw new Error('La copia de pedidos no está preparada.');
      }
      const estadoMesas = await this.diario.obtenerConVersion('estado-local', 'mesas', instantanea.hastaSecuencia);
      const mesas = estadoMesas.contenido?.datos ?? instantanea.maestros.mesas;
      if (!Array.isArray(mesas) || !mesas.some(mesa => mesa.IdEspacio === pedido.IdEspacio && mesa.Ocupado === 1)) {
        throw new Error('La mesa no está ocupada.');
      }
      const cuentas = await this.listarPedidos.ejecutar();
      const otrasCuentasActivas = cuentas.some(item => item.identificador !== copia.referenciaPedido
        && item.contenido.IdEspacio === pedido.IdEspacio && [1, 6].includes(item.contenido.Estado));
      // Toda cuenta que se cobra modifica la versión de mesas, incluso si
      // permanece ocupada. Así, dos cierres concurrentes deben reconsultar.
      cambios.push({
        tipo: 'estado-local', identificador: 'mesas', versionEsperada: estadoMesas.version,
        contenido: { datos: mesas.map(mesa => mesa.IdEspacio === pedido.IdEspacio
          ? { ...mesa, Ocupado: otrasCuentasActivas ? 1 : 0 } : mesa) },
      });
    }
    const resultado = await this.diario.aplicar({
      id: copia.idOperacion,
      operacion: { tipo: 'registrar-cobro', datos: { solicitud: copia, ...(previo ? { previo } : {}) } },
      cambios,
    }, async () => {
      if ((await this.maestros.obtener())?.version !== instantanea.version) {
        throw new Error('Los maestros cambiaron; actualice los datos antes de cobrar.');
      }
    }, instantanea.hastaSecuencia);
    return { referencia: copia.idOperacion, resultado };
  }
}
