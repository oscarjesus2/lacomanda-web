import { ImpresionDTO } from './impresionDTO.interface';

// Refleja Application.Dto.Turno.CerrarTurnoRequestDto (PascalCase).
export interface CerrarTurnoRequest {
  IdCaja: number;
  EsParcial: boolean;
  ConfirmarVentasSinPagoComoCredito: boolean;
  TipoFormato: number;   // 0 = ticket por defecto
}

// Venta TK/FT sin pago registrado (para confirmar como crédito).
export interface VentaSinPago {
  IdVenta?: number;
  Serie?: string;
  NroDoc?: string;
  NumDocumento?: string;
  Total?: number;
  Cliente?: string;
}

export interface PedidoPendienteCierre {
  IdPedido: number;
  NroCuenta: number;
  NroPedido: number;
  IdTurno: number;
  IdEspacio?: number | null;
  Espacio: string;
  IdEmpleado: number;
  Empleado: string;
  IdCanalVenta: number;
  CanalVenta: string;
  Cliente: string;
  MontoPendiente: number;
  FechaPedido: Date | string;
}

export interface AnularPedidoPendienteRequest {
  IdPedido: number;
  NroCuenta: number;
  MotivoAnula: string;
  Ip?: string | null;
}

// Refleja Application.Dto.Turno.CerrarTurnoResultDto.
export interface CerrarTurnoResult {
  IdTurno: number;
  Cerrado: boolean;
  RequiereConfirmacionCredito: boolean;
  VentasSinPago: VentaSinPago[];
  RequiereResolverPedidosPendientes: boolean;
  PedidosPendientes: PedidoPendienteCierre[];
  Impresiones: ImpresionDTO[];
  Mensaje: string;
}
