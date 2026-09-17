export type EstadoSolicitudAutorizacion =
  | 'Pendiente'
  | 'Aprobada'
  | 'Denegada'
  | 'Cancelada'
  | 'SinEfecto'
  | 'Caducada'
  | 'Utilizada';

export type TipoSolicitudAutorizacion =
  | 'AnularProducto'
  | 'CambiarCamarero'
  | 'AnularPedido'
  | 'DescuentoPedido'
  | 'DescuentoEntrada'
  | 'EntradasGratis';

/** Parámetros de la acción, tal como los guardó el servidor. */
export interface DatosSolicitudAutorizacion {
  IdEmpleado?: number;
  IdDescuento?: number;
  Porcentaje?: number;
  NroCupon?: string | null;
  Item?: number;
  IdProducto?: number;
  DescuentoUnitario?: number;
  PrecioUnitario?: number;
  Socios?: number;
  Invitados?: number;
}

export interface SolicitudAutorizacion {
  IdSolicitud: number;
  Tipo: TipoSolicitudAutorizacion | string;
  Estado: EstadoSolicitudAutorizacion;
  IdPedido: number;
  NroCuenta: number;
  Item: number | null;
  IdEspacio: number | null;
  Ubicacion: string;
  Descripcion: string;
  Importe: number;
  Motivo: string;
  /** Parámetros de la acción (camarero, descuento, cantidades…). */
  Datos: DatosSolicitudAutorizacion | null;
  /** Solo la aprueba quien además puede aplicar descuentos. */
  RequierePermisoDescuento: boolean;
  /** Autorización de un uso: tras aprobarse, quien la pidió la consume. */
  RequiereUso: boolean;
  IdUsuarioSolicita: number;
  UsuarioSolicita: string;
  FechaSolicitudUtc: Date;
  UsuarioResuelve: string | null;
  FechaResolucionUtc: Date | null;
  FechaUsoUtc: Date | null;
  Observacion: string | null;
}

/** Aprobada y todavía sin consumir. */
export function autorizacionDisponible(solicitud: SolicitudAutorizacion): boolean {
  return solicitud.RequiereUso && solicitud.Estado === 'Aprobada';
}

export interface SolicitudAutorizacionCreada {
  Solicitud: SolicitudAutorizacion;
  /** Aprobadores con la aplicación abierta. Con 0 la solicitud igualmente queda pendiente. */
  AprobadoresConectados: number;
}

export interface SolicitarAnulacionProducto {
  IdPedido: number;
  NroCuenta: number;
  Item: number;
  Motivo: string;
  IdentificadorEstacion: string | null;
}

export interface SolicitarAnulacionPedido {
  IdPedido: number;
  NroCuenta: number;
  Motivo: string;
  IdentificadorEstacion: string | null;
}

export interface SolicitarCambioCamarero {
  IdPedido: number;
  NroCuenta: number;
  IdEmpleado: number;
  IdentificadorEstacion: string | null;
}

export interface SolicitarDescuentoPedido {
  IdPedido: number;
  NroCuenta: number;
  Item: number;
  IdDescuento: number;
  Porcentaje: number;
  NroCupon: string | null;
  Motivo: string | null;
  IdentificadorEstacion: string | null;
}

export interface SolicitarDescuentoEntrada {
  IdCaja: number;
  IdProducto: number;
  DescuentoUnitario: number;
  Motivo: string | null;
  IdentificadorEstacion: string | null;
}

export interface SolicitarEntradasGratis {
  IdCaja: number;
  Socios: number;
  Invitados: number;
  Motivo: string | null;
  IdentificadorEstacion: string | null;
}

export interface PreferenciasSolicitudes {
  RecibirPorCorreo: boolean;
  Email: string | null;
  EsAprobador: boolean;
  PuedeAprobarDescuentos: boolean;
}

/**
 * Las respuestas HTTP llegan en PascalCase y con fechas convertidas por el
 * interceptor; los mensajes de SignalR llegan en camelCase y con fechas como
 * texto. Esta función deja ambos con la misma forma.
 */
export function normalizarSolicitudAutorizacion(raw: any): SolicitudAutorizacion {
  const valor = (pascal: string) => raw?.[pascal] ?? raw?.[pascal.charAt(0).toLowerCase() + pascal.slice(1)];
  const fecha = (pascal: string): Date | null => {
    const v = valor(pascal);
    return v ? new Date(v) : null;
  };
  const numeroOpcional = (pascal: string): number | null => {
    const v = valor(pascal);
    return v === null || v === undefined ? null : Number(v);
  };

  return {
    IdSolicitud: Number(valor('IdSolicitud') ?? 0),
    Tipo: String(valor('Tipo') ?? ''),
    Estado: String(valor('Estado') ?? 'Pendiente') as EstadoSolicitudAutorizacion,
    IdPedido: Number(valor('IdPedido') ?? 0),
    NroCuenta: Number(valor('NroCuenta') ?? 0),
    Item: numeroOpcional('Item'),
    IdEspacio: numeroOpcional('IdEspacio'),
    Ubicacion: String(valor('Ubicacion') ?? ''),
    Descripcion: String(valor('Descripcion') ?? ''),
    Importe: Number(valor('Importe') ?? 0),
    Motivo: String(valor('Motivo') ?? ''),
    Datos: leerDatos(valor('Datos')),
    RequierePermisoDescuento: valor('RequierePermisoDescuento') === true,
    RequiereUso: valor('RequiereUso') === true,
    IdUsuarioSolicita: Number(valor('IdUsuarioSolicita') ?? 0),
    UsuarioSolicita: String(valor('UsuarioSolicita') ?? ''),
    FechaSolicitudUtc: fecha('FechaSolicitudUtc') ?? new Date(),
    UsuarioResuelve: valor('UsuarioResuelve') ?? null,
    FechaResolucionUtc: fecha('FechaResolucionUtc'),
    FechaUsoUtc: fecha('FechaUsoUtc'),
    Observacion: valor('Observacion') ?? null,
  };
}

/** El servidor guarda los parámetros como JSON; aquí se leen con nombres PascalCase. */
function leerDatos(raw: unknown): DatosSolicitudAutorizacion | null {
  if (!raw) return null;
  try {
    const plano = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!plano || typeof plano !== 'object') return null;
    const datos: Record<string, unknown> = {};
    Object.entries(plano as Record<string, unknown>).forEach(([clave, valor]) => {
      datos[clave.charAt(0).toUpperCase() + clave.slice(1)] = valor;
    });
    return datos as DatosSolicitudAutorizacion;
  } catch {
    return null;
  }
}
