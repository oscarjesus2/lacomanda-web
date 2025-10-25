export enum TipoIdentidadEnum {   DNI = "DNI",
  NIE = "NIE",
  NIF = "NIF",
  CEXTRAJ = "CEXTRAJ",
  RUC = "RUC",
  PASS = "PASS",
  OTROS = "OTROS" }

export class Configuracion {
  IdConfig: number;
  PaisISO2?: string;
  IdTipoIdentidad?: TipoIdentidadEnum;
  NumeroIdentificacion: string;
  RazonSocial: string;
  NombreComercial: string;
  Direccion: string;
  Telefono: string;
  PiePagina: string;
  Traslado: boolean;
  Precuentas: boolean;
  CambioMesa: boolean;
  Diario: boolean;
  NroPrecuentas: number;
  Anfitrionas: boolean;
  ResumenVenta: boolean;
  VentaPorProducto: boolean;
  Liquidacion: boolean;
  ConsumoArticulo: boolean;
  GastosDiarios: boolean;
  IncluirExpressEnCierre: boolean;
  TieneProductoPropina: boolean;
  TieneProductoPrecioDelivery: boolean;
  TieneDescuentoTragoCortesia: boolean;
  Servicio: number;  
}
