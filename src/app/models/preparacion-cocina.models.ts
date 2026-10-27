import {
  EstadoPreparacionPedidoEnum,
  TipoLineaPreparacionPedidoEnum,
} from '../enums/enum';

export interface EstacionPreparacion {
  Descripcion: string;
  AreasPreparacion: string[];
}

export interface LineaPreparacionCocina {
  IdPedido: number;
  NroCuenta: number;
  Item: number;
  SubItem?: number | null;
  TipoLinea: TipoLineaPreparacionPedidoEnum;
  NroPedido: number;
  IdCanalVenta: number;
  Espacio?: string | null;
  NumeroEspacio?: number | null;
  Ambiente?: string | null;
  Mozo?: string | null;
  EstacionOrigen?: string | null;
  EsAutopedidoQr?: boolean;
  Cliente: string;
  Direccion: string;
  Referencia: string;
  Producto: string;
  Cantidad: number;
  Observacion: string;
  FechaEnvioUtc: string;
  EstadoPreparacion: EstadoPreparacionPedidoEnum;
  EsAnulado?: boolean;
  EsFacturado?: boolean;
  FechaOcultadoPreparacionUtc?: string | null;
  UsuarioOcultaPreparacion?: string | null;
  EstadoPreparacionAlOcultar?: EstadoPreparacionPedidoEnum | null;
  MotivoOcultacionPreparacion?: number | null;
  MotivoAnulacion?: string | null;
  FechaAnulacionUtc?: string | null;
  FechaInicioPreparacionUtc?: string | null;
  FechaPreparadoUtc?: string | null;
  FechaEntregadoUtc?: string | null;
}

export interface CambiarEstadoPreparacionPedido {
  IdPedido: number;
  NroCuenta: number;
  Item: number;
  TipoLinea: TipoLineaPreparacionPedidoEnum;
  SubItem?: number | null;
  EstadoPreparacion: EstadoPreparacionPedidoEnum;
}

export type OcultarLineaPreparacion = Omit<CambiarEstadoPreparacionPedido, 'EstadoPreparacion'>;
