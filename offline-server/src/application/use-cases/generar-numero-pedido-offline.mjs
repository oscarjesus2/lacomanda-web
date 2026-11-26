import { validarNumeroPedidoOffline } from '../validators/validar-numero-pedido-offline.mjs';

/** Genera la referencia de comanda sin consumir numeración de la nube. */
export class GenerarNumeroPedidoOffline {
  ejecutar(idEstacion, idOperacion) {
    validarNumeroPedidoOffline(idEstacion, idOperacion);
    return `OFF-E${idEstacion}-${idOperacion.toLowerCase()}`;
  }
}
