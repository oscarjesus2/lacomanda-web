import { CuentaLocal, MesaCaja, ProductoCaja } from './caja-offline-api.service';
import { cartaVentaLocal, resumenCuentaLocal, tableroMesasLocal } from './tablero-venta-local';

describe('Tablero habitual de venta con datos locales', () => {
  const producto = (datos: Partial<ProductoCaja>): ProductoCaja => ({
    IdProducto: 9, Visible: true, IdSeccionMenu: 0, ...datos,
  } as ProductoCaja);
  const cuenta = (id: string, estado: number, total: number): CuentaLocal => ({
    identificador: id, version: 2, contenido: {
      IdPedido: 0, NroCuenta: 1, NroPedidoOffline: id, IdEspacio: 8, Estado: estado, Total: total, IdEmpleado: 14,
    },
  } as CuentaLocal);

  it('conserva las familias, las posiciones de carta, el color y los artículos solo disponibles por búsqueda', () => {
    const basico = { IdFamilia: 2, Familia: 'Comidas', IdSubFamilia: 7, SubFamilia: 'Platos', R: 124, G: 192, B: 78 };
    const carta = cartaVentaLocal([
      producto({ ...basico, Posicion: 8 }), producto({ ...basico, IdProducto: 10, Posicion: 0 }),
      producto({ IdProducto: 20, EsCargoDelivery: true }),
    ]);
    expect(carta.familias.map(f => f.Descripcion)).toEqual(['Comidas']);
    expect(carta.subfamilias.map(s => s.Descripcion)).toEqual(['Platos']);
    expect(carta.productos.map(p => p.Posicion)).toEqual([8, 0]);
    expect(carta.productos[0].Color).toBe('rgb(124, 192, 78)');
  });

  it('permite usar una copia anterior que aún no contiene familias ni posiciones', () => {
    const carta = cartaVentaLocal([producto({ IdSeccionMenu: 6 })]);
    expect(carta.familias[0].Descripcion).toBe('Carta');
    expect(carta.productos[0].Posicion).toBe(1);
    expect(carta.productos[0].IdClaseCombo).toBe(6);
  });

  it('identifica una cuenta local aunque todavía no tenga identificador de nube', () => {
    const pedido = resumenCuentaLocal(cuenta('OFF-E1-5', 1, 18));
    expect(pedido.IdPedido).toBe(0);
    expect(pedido.NroPedido).toBe('OFF-E1-5');
    expect(pedido.referenciaLocal).toBe('OFF-E1-5');
  });

  it('mantiene posiciones y agrupa las cuentas activas de una mesa dividida', () => {
    const mesas = [
      { IdEspacio: 8, IdAmbiente: 4, Ambiente: 'Bar', Posicion: 10, PosicionAmbiente: 2, Ocupado: 1 },
      { IdEspacio: 5, IdAmbiente: 9, Ambiente: 'Salón', Posicion: 3, PosicionAmbiente: 1, Ocupado: 0 },
    ] as MesaCaja[];
    const tablero = tableroMesasLocal(mesas,
      [cuenta('OFF-1', 1, 18), cuenta('OFF-2', 1, 12), cuenta('ONLINE-3-1', 6, 15)], new Map([[14, 'Lucía']]));
    expect(tablero.ambientes.map(a => a.Descripcion)).toEqual(['Salón', 'Bar']);
    expect(tablero.espacios[0].Posicion).toBe(10);
    expect(tablero.espacios[0].Ocupado).toBe(3);
    expect(tablero.espacios[0].Total).toBe(30);
    expect(tablero.espacios[0].NombreEmpleado).toBe('Lucía');
    expect(tablero.espacios[1].Ocupado).toBe(0);
  });
});
