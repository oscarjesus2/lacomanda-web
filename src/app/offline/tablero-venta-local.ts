import { PedidoEstadoEnum } from '../enums/enum';
import { TABLERO_PRODUCTOS } from '../constants/tablero-productos';
import { PedidoDeliveryDTO } from '../interfaces/pedidoDTO.interface';
import { Ambiente } from '../models/ambiente.models';
import { Espacios } from '../models/espacios.models';
import { Familia } from '../models/familia.models';
import { Producto } from '../models/product.models';
import { SubFamilia } from '../models/subfamilia.models';
import { CuentaLocal, MesaCaja, ProductoCaja } from './caja-offline-api.service';

export function cartaVentaLocal(catalogo: ProductoCaja[]) {
  const familias = new Map<number, Familia>();
  const subfamilias = new Map<number, SubFamilia>();
  const productos = catalogo.filter(p => !p.EsCargoDelivery).map((p, indice) => {
    const idFamilia = p.IdFamilia ?? 0;
    const idSubFamilia = p.IdSubFamilia ?? 0;
    familias.set(idFamilia, new Familia({ IdFamilia: idFamilia, Descripcion: p.Familia || 'Carta' }));
    subfamilias.set(idSubFamilia, new SubFamilia({
      IdFamilia: idFamilia, IdSubFamilia: idSubFamilia, Descripcion: p.SubFamilia || 'Productos',
    }));
    return {
      ...p, IdFamilia: idFamilia, IdSubFamilia: idSubFamilia, IdClaseCombo: p.IdSeccionMenu ?? 0,
      Posicion: p.Posicion ?? indice + 1, Visible: p.Visible !== false,
      Color: [p.R, p.G, p.B].every(Number.isFinite) ? `rgb(${p.R}, ${p.G}, ${p.B})` : '',
    };
  });
  return { productos, familias: [...familias.values()], subfamilias: [...subfamilias.values()] };
}

/** La copia local contiene artículos. El tablero online también reserva las posiciones libres de cada subfamilia. */
export function completarTableroProductosLocal(productos: Producto[]): Producto[] {
  if (!productos.length) return [];

  const tablero = [...productos];
  const ocupadas = new Set(productos.map(producto => producto.Posicion));
  const total = TABLERO_PRODUCTOS.rows * TABLERO_PRODUCTOS.cols;
  for (let posicion = 1; posicion <= total; posicion++) {
    if (!ocupadas.has(posicion)) {
      tablero.push(new Producto({ Posicion: posicion, Visible: false }));
    }
  }
  return tablero.sort((a, b) => a.Posicion - b.Posicion);
}

export function resumenCuentaLocal(cuenta: CuentaLocal): PedidoDeliveryDTO {
  const pedido = cuenta.contenido;
  return {
    referenciaLocal: cuenta.identificador, IdPedido: pedido.IdPedido || 0, NroCuenta: pedido.NroCuenta,
    NroPedido: String(pedido.NroPedidoOffline || pedido.NroPedido || cuenta.identificador),
    Cliente: String(pedido.Cliente ?? ''), IdEspacio: pedido.IdEspacio ?? null,
    IdCanalVenta: pedido.IdCanalVenta, Estado: pedido.Estado, Total: pedido.Total,
    FechaPedido: pedido.FecReg, Posicion: 0, Visible: true,
  };
}

export function tableroMesasLocal(mesas: MesaCaja[], cuentas: CuentaLocal[], empleados: Map<number, string>) {
  const ambientes = new Map<number, Ambiente>();
  const espacios = mesas.map(mesa => {
    ambientes.set(mesa.IdAmbiente, {
      IdAmbiente: mesa.IdAmbiente, Descripcion: mesa.Ambiente || 'Salón', Estado: 1, Posicion: mesa.PosicionAmbiente ?? 0,
    });
    const activas = cuentas.filter(c => c.contenido.IdEspacio === mesa.IdEspacio && c.contenido.Estado === PedidoEstadoEnum.Activo);
    return new Espacios({
      ...mesa, Visible: mesa.Visible !== false, Ocupado: activas.length > 1 ? 3 : mesa.Ocupado,
      Total: activas.reduce((suma, c) => suma + c.contenido.Total, 0),
      NombreEmpleado: empleados.get(activas[0]?.contenido.IdEmpleado) ?? '',
      TienePrecuenta: activas.some(c => c.contenido.NumPrecuentas > 0),
    });
  });
  return { espacios, ambientes: [...ambientes.values()].sort((a, b) => a.Posicion - b.Posicion) };
}
