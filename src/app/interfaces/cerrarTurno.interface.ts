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

// Refleja Application.Dto.Turno.CerrarTurnoResultDto.
export interface CerrarTurnoResult {
  IdTurno: number;
  Cerrado: boolean;
  RequiereConfirmacionCredito: boolean;
  VentasSinPago: VentaSinPago[];
  Impresiones: ImpresionDTO[];
  Mensaje: string;
}
