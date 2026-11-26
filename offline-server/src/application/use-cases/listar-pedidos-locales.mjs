/** Une los pedidos de la última copia de nube con sus versiones locales. */
export class ListarPedidosLocales {
  constructor(maestros, diario) {
    this.maestros = maestros;
    this.diario = diario;
  }

  async ejecutar() {
    const snapshot = await this.maestros.obtener();
    if (!Array.isArray(snapshot?.maestros?.pedidos)) {
      throw new Error('La copia de pedidos no está preparada.');
    }
    const resultado = new Map();
    for (const pedido of snapshot.maestros.pedidos) {
      if (!Number.isSafeInteger(pedido.IdPedido) || pedido.IdPedido <= 0
          || !Number.isSafeInteger(pedido.NroCuenta) || pedido.NroCuenta <= 0) {
        throw new Error('La copia de pedidos contiene una cuenta inválida.');
      }
      const identificador = `ONLINE-${pedido.IdPedido}-${pedido.NroCuenta}`;
      if (resultado.has(identificador)) throw new Error('La copia contiene cuentas repetidas.');
      resultado.set(identificador, { identificador, contenido: structuredClone(pedido), version: 0 });
    }
    for (const pedido of await this.diario.listar('pedidos', snapshot.hastaSecuencia)) {
      resultado.set(pedido.identificador, pedido);
    }
    return [...resultado.values()];
  }
}
