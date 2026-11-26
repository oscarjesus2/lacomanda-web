import { validarConsultaImpresionesOffline } from '../validators/validar-consulta-impresiones-offline.mjs';
import { validarUsuariosOffline } from '../validators/validar-usuarios-offline.mjs';
import { recuperarProgreso } from './planificar-impresion-pedido-offline.mjs';

/** Recupera desde caja los planes que todavía no tienen confirmación final. */
export class ListarImpresionesPendientesOffline {
  constructor(maestros, diario, progreso) {
    this.maestros = maestros;
    this.diario = diario;
    this.progreso = progreso;
  }

  async ejecutar(solicitud) {
    validarConsultaImpresionesOffline(solicitud);
    const instantanea = await this.maestros.obtener();
    const usuarios = validarUsuariosOffline(instantanea);
    if (!usuarios.some(item => item.IdUsuario === solicitud.idUsuario)) {
      throw new Error('El usuario seleccionado no está disponible.');
    }
    const planes = await this.progreso.listar();
    const conocidos = new Set(planes.map(item => item.plan.idOperacionPedido));
    for (const documento of await this.diario.listar('estado-local', instantanea.hastaSecuencia)) {
      if (documento.identificador.startsWith('plan-') && !conocidos.has(documento.contenido.idOperacionPedido)) {
        planes.push(await recuperarProgreso(this.progreso, documento.contenido));
      }
    }
    const resultado = [];
    for (const item of planes) {
      if (!solicitud.todaLaEstacion && (item.plan.idEstacion !== solicitud.idEstacion || item.plan.idUsuario !== solicitud.idUsuario)) continue;
      const confirmada = await this.diario.obtener('estado-local', `impresion-${item.plan.idOperacionPedido.toLowerCase()}`);
      if (!confirmada?.confirmada) resultado.push(item);
    }
    return resultado;
  }
}
