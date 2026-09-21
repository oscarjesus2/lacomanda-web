export interface ComprobanteFiscalPendiente {
  IdVenta: number;
  FechaEmisionUtc: Date;
  TipoDocumento: string;
  NumeroDocumento: string;
  Caja: string;
  Cliente: string;
  Total: number;
  CodigoRespuesta: string | null;
  MensajeRespuesta: string | null;
  FechaRespuestaUtc: Date | null;
}

export interface ComprobantesFiscalesPendientes {
  Total: number;
  Registros: ComprobanteFiscalPendiente[];
}

export function normalizarComprobantesFiscalesPendientes(
  raw: any,
): ComprobantesFiscalesPendientes {
  const registrosRaw = raw?.Registros ?? raw?.registros ?? [];
  const registros = registrosRaw.map((item: any) => ({
    IdVenta: Number(item?.IdVenta ?? item?.idVenta ?? 0),
    FechaEmisionUtc: new Date(
      item?.FechaEmisionUtc ?? item?.fechaEmisionUtc,
    ),
    TipoDocumento: item?.TipoDocumento ?? item?.tipoDocumento ?? '',
    NumeroDocumento: item?.NumeroDocumento ?? item?.numeroDocumento ?? '',
    Caja: item?.Caja ?? item?.caja ?? '',
    Cliente: item?.Cliente ?? item?.cliente ?? '',
    Total: Number(item?.Total ?? item?.total ?? 0),
    CodigoRespuesta:
      item?.CodigoRespuesta ?? item?.codigoRespuesta ?? null,
    MensajeRespuesta:
      item?.MensajeRespuesta ?? item?.mensajeRespuesta ?? null,
    FechaRespuestaUtc:
      item?.FechaRespuestaUtc ?? item?.fechaRespuestaUtc
        ? new Date(item?.FechaRespuestaUtc ?? item?.fechaRespuestaUtc)
        : null,
  }));

  return {
    Total: Number(raw?.Total ?? raw?.total ?? registros.length),
    Registros: registros,
  };
}
