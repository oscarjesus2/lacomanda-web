import { RepositorioMaestrosLocales } from './infrastructure/archivos/repositorio-maestros-locales.mjs';
import { DiarioTransaccionalLocal } from './infrastructure/archivos/diario-transaccional-local.mjs';
import { ObtenerMaestroLocal } from './application/use-cases/obtener-maestro-local.mjs';
import { ObtenerPedidoLocal } from './application/use-cases/obtener-pedido-local.mjs';
import { ListarPedidosLocales } from './application/use-cases/listar-pedidos-locales.mjs';
import { ListarUsuariosOffline } from './application/use-cases/listar-usuarios-offline.mjs';
import { RegistrarNuevoPedidoOffline } from './application/use-cases/registrar-nuevo-pedido-offline.mjs';
import { ModificarPedidoOffline } from './application/use-cases/modificar-pedido-offline.mjs';
import { RegistrarCobroPendienteOffline } from './application/use-cases/registrar-cobro-pendiente-offline.mjs';
import { ConfirmarImpresionPedidoOffline } from './application/use-cases/confirmar-impresion-pedido-offline.mjs';
import { PrepararComandaOffline } from './application/use-cases/preparar-comanda-offline.mjs';
import { GestionarProgresoImpresionOffline } from './application/use-cases/gestionar-progreso-impresion-offline.mjs';
import { ListarImpresionesPendientesOffline } from './application/use-cases/listar-impresiones-pendientes-offline.mjs';
import { RepositorioProgresoImpresion } from './infrastructure/archivos/repositorio-progreso-impresion.mjs';
import { AsyncLocalStorage } from 'node:async_hooks';
import { ClienteInstantaneaNube } from './infrastructure/nube/cliente-instantanea-nube.mjs';
import { ClienteRegularizacionNube } from './infrastructure/nube/cliente-regularizacion-nube.mjs';
import { SincronizarMaestrosLocales } from './application/use-cases/sincronizar-maestros-locales.mjs';
import { RegularizarLoteLocal } from './application/use-cases/regularizar-lote-local.mjs';
import { RepositorioLotesLocales } from './infrastructure/archivos/repositorio-lotes-locales.mjs';
import { ObtenerEstadoCaja } from './application/use-cases/obtener-estado-caja.mjs';
import { ConsultarOperacionLocal } from './application/use-cases/consultar-operacion-local.mjs';
import { vincularDirectorioCaja } from './infrastructure/archivos/vincular-directorio-caja.mjs';

export async function prepararCajaLocal(configuracion, fetchImpl = globalThis.fetch) {
  const { directorio, contexto, origenesPermitidos } = configuracion;
  const repositorio = new RepositorioMaestrosLocales(directorio);
  await vincularDirectorioCaja(directorio, contexto, repositorio);
  const diario = new DiarioTransaccionalLocal(directorio);
  const progreso = new RepositorioProgresoImpresion(directorio);
  const lotes = new RepositorioLotesLocales(directorio);
  // La credencial pertenece a la petición de gestión, también cuando dos peticiones se encolan.
  const sesion = new AsyncLocalStorage();
  const obtenerToken = () => sesion.getStore();
  const fuente = new ClienteInstantaneaNube({ url: configuracion.urlInstantanea, obtenerToken, contexto, fetchImpl });
  const destino = new ClienteRegularizacionNube({ url: configuracion.urlLotes, obtenerToken, fetchImpl });
  const sincronizacion = new SincronizarMaestrosLocales(fuente, repositorio, diario, lotes);
  const regularizacion = new RegularizarLoteLocal(diario, lotes, destino, contexto);
  await diario.iniciar();
  return {
    obtenerEstado: new ObtenerEstadoCaja(repositorio, configuracion.habilitado, contexto, diario, lotes),
    consultarOperacion: new ConsultarOperacionLocal(diario),
    sincronizar: token => sesion.run(token, () => sincronizacion.ejecutar()),
    regularizar: token => sesion.run(token, () => regularizacion.ejecutar()),
    obtenerMaestroLocal: new ObtenerMaestroLocal(repositorio, diario),
    obtenerPedidoLocal: new ObtenerPedidoLocal(repositorio, diario),
    listarPedidosLocales: new ListarPedidosLocales(repositorio, diario),
    listarUsuariosOffline: new ListarUsuariosOffline(repositorio),
    registrarPedido: new RegistrarNuevoPedidoOffline(repositorio, diario, progreso),
    modificarPedido: new ModificarPedidoOffline(repositorio, diario, progreso),
    registrarCobro: new RegistrarCobroPendienteOffline(repositorio, diario),
    confirmarImpresion: new ConfirmarImpresionPedidoOffline(repositorio, diario, progreso),
    progresoImpresion: new GestionarProgresoImpresionOffline(repositorio, diario, progreso),
    listarImpresionesPendientes: new ListarImpresionesPendientesOffline(repositorio, diario, progreso),
    prepararComanda: new PrepararComandaOffline(),
    diario,
    origenesPermitidos,
  };
}
