import { validarUsuariosOffline } from '../validators/validar-usuarios-offline.mjs';
import { validarCajaTurnoOffline } from '../validators/validar-caja-turno-offline.mjs';

export class ObtenerEstadoCaja {
  constructor(maestros, habilitado, identidad, diario, lotes) {
    this.maestros = maestros;
    this.habilitado = habilitado;
    this.identidad = identidad;
    this.diario = diario;
    this.lotes = lotes;
  }

  async ejecutar() {
    const actual = await this.maestros.obtener();
    const m = actual?.maestros;
    const contexto = m?.contexto ?? null;
    // El cursor solo avanza tras el acuse completo. También cubre los lotes activos en reintento.
    const cursor = await this.lotes.obtenerCursor();
    const regularizacionPendiente = (await this.diario.obtenerUltimaSecuencia()) !== cursor.hastaSecuencia;
    const estado = { disponible: false, version: actual?.version ?? null, contexto, identidad: this.identidad,
      versionProtocolo: 2, regularizacionPendiente,
      capacidades: { pedidos: false, impresion: false, cobros: false } };
    if (!this.habilitado) return { ...estado, mensaje: 'La operación offline está desactivada en caja.' };
    if (!contexto || !(contexto.idEstacion > 0) || !(contexto.idCaja > 0)) {
      return { ...estado, mensaje: 'Sincronice la caja con la nube antes de operar.' };
    }
    const operadores = Array.isArray(m.usuarios) ? validarUsuariosOffline(actual)
      .filter(usuario => usuario.IdEmpleado > 0 && [1, 2, 3, 4].includes(usuario.IdNivel)) : [];
    if (!operadores.length) {
      return { ...estado, mensaje: 'La copia no contiene operadores activos con empleado asignado.' };
    }
    try {
      validarCajaTurnoOffline(m, contexto.idCaja);
    } catch {
      return { ...estado, mensaje: 'La caja no dispone de un turno abierto en la copia local.' };
    }
    const areas = new Set((m.areas ?? []).filter(area => area.NombreImpresora?.trim() && area.Descripcion?.trim())
      .map(area => area.IdAreaImpresion));
    const caja = m.cajas.find(item => item.IdCaja === contexto.idCaja);
    estado.capacidades.impresion = areas.size > 0;
    estado.capacidades.pedidos = Array.isArray(m.mesas) && !!caja.CanalesVenta?.some(canal => [2, 3, 4].includes(canal))
      && hayProductoParaPedido(m.productos ?? [], areas);
    const medioCobro = caja.PermiteVentaCredito || (m.tipospago ?? []).some(tipo => tipo.IdTipoPago === 1
      || (tipo.IdTipoPago === 3 && m.tarjetas?.length));
    estado.capacidades.cobros = operadores.some(usuario => [1, 2, 4].includes(usuario.IdNivel)) && !!medioCobro
      && (m.documentos ?? []).some(doc => [1, 2, 5, 9].includes(doc.IdTipoDocumento));
    estado.disponible = estado.capacidades.pedidos || estado.capacidades.cobros;
    return { ...estado, mensaje: estado.disponible ? 'Caja preparada para operar.' : 'Revise el catálogo y las impresoras de la caja.' };
  }
}

function hayProductoParaPedido(productos, areas) {
  const activos = productos.filter(p => p.Activo && (p.NombreCompleto || p.NombreCorto)?.trim());
  const porId = new Map(activos.map(p => [p.IdProducto, p]));
  const destinosDisponibles = p => Array.isArray(p.AreasImpresion) && p.AreasImpresion.every(id => areas.has(id));
  return activos.some(producto => {
    if (producto.Visible === false || producto.Tipo === 3) return false;
    if (producto.Tipo === 1 && producto.IdSeccionMenu === 0) {
      const secciones = producto.SeccionesMenu ?? [];
      const tieneOpcion = seccion => seccion.Opciones?.some(id => {
        const opcion = porId.get(id);
        return opcion?.Tipo === 1 && opcion.IdSeccionMenu === seccion.IdSeccionMenu && destinosDisponibles(opcion);
      });
      return secciones.length > 0 && secciones.every(seccion => seccion.Cantidad > 0
        && (seccion.EsOpcional || tieneOpcion(seccion)));
    }
    return producto.AreasImpresion?.length > 0 && destinosDisponibles(producto)
      && (producto.Tipo !== 1 || producto.VentaIndividual === true);
  });
}
