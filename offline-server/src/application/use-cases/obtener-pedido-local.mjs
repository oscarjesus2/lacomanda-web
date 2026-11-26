/** Combina la copia de pedidos existente con los cambios registrados en caja. */
export class ObtenerPedidoLocal {
  constructor(maestros, diario) {
    this.maestros = maestros;
    this.diario = diario;
  }

  async ejecutar(referencia) {
    const estado = await this.maestros.obtener();
    const actual = await this.diario.obtenerConVersion('pedidos', referencia, estado?.hastaSecuencia);
    if (actual.contenido) return actual;
    const coincidencia = /^ONLINE-([1-9][0-9]*)-([1-9][0-9]*)$/.exec(referencia);
    if (!coincidencia) return actual;
    const idPedido = Number(coincidencia[1]);
    const nroCuenta = Number(coincidencia[2]);
    if (!Number.isSafeInteger(idPedido) || !Number.isSafeInteger(nroCuenta)) return actual;
    if (!Array.isArray(estado?.maestros?.pedidos)) {
      throw new Error('La copia de pedidos no está preparada.');
    }
    const pedido = estado.maestros.pedidos.find(item => item.IdPedido === idPedido && item.NroCuenta === nroCuenta);
    return { contenido: pedido ? structuredClone(pedido) : null, version: 0 };
  }
}
