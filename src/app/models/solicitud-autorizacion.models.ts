export type EstadoSolicitudAutorizacion =
  | 'Pendiente'
  | 'Aprobada'
  | 'Denegada'
  | 'Cancelada'
  | 'SinEfecto'
  | 'Caducada';

export interface SolicitudAutorizacion {
  IdSolicitud: number;
  Tipo: string;
  Estado: EstadoSolicitudAutorizacion;
  IdPedido: number;
  NroCuenta: number;
  Item: number | null;
  IdEspacio: number | null;
  Ubicacion: string;
  Descripcion: string;
  Importe: number;
  Motivo: string;
  IdUsuarioSolicita: number;
  UsuarioSolicita: string;
  FechaSolicitudUtc: Date;
  UsuarioResuelve: string | null;
  FechaResolucionUtc: Date | null;
  Observacion: string | null;
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
    IdUsuarioSolicita: Number(valor('IdUsuarioSolicita') ?? 0),
    UsuarioSolicita: String(valor('UsuarioSolicita') ?? ''),
    FechaSolicitudUtc: fecha('FechaSolicitudUtc') ?? new Date(),
    UsuarioResuelve: valor('UsuarioResuelve') ?? null,
    FechaResolucionUtc: fecha('FechaResolucionUtc'),
    Observacion: valor('Observacion') ?? null,
  };
}
