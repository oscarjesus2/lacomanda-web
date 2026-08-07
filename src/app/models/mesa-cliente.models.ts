export interface SolicitudAccesoMesa {
  IdSesion: number;
  Token: string;
  CodigoVisual: string;
  Estado: string;
  Ambiente: string;
  Espacio: string;
  Numero: number;
  ExpiraUtc: Date;
}

export interface EstadoAccesoMesa {
  IdSesion: number;
  Estado: string;
  Ambiente: string;
  Espacio: string;
  Numero: number;
  CodigoVisual: string;
  ExpiraUtc: Date;
  PuedePedir: boolean;
  PuedePagarConTarjeta: boolean;
  IdPedido?: number;
  NroCuenta?: number;
}

export interface SolicitudMesaPendiente {
  IdSesion: number;
  IdEspacio: number;
  Ambiente: string;
  Espacio: string;
  Numero: number;
  CodigoVisual: string;
  FechaSolicitudUtc: Date;
  ExpiraUtc: Date;
}

export interface ConfirmarSolicitudMesa {
  IdCaja: number;
  IdTurno: number;
  NroPax: number;
  IdentificadorEstacion: string;
}
