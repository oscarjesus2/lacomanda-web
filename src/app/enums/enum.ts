export enum EnumTipoDocumento {
  FacturaVenta = 1,
  BoletaVenta = 2,
  NotaCredito = 3,
  NotaDebito = 4,
  FacturaSimplificada = 5,
  FacturaRectificativa = 6,
  FacturaManual = 7,
  BoletaManual = 8,
  Express = 9,
}

export enum EnumTipoIdentidad {
  DNI = 'DNI',
  RUC = 'RUC',
  NIE = 'NIE',
  NIF = 'NIF',
  PASAPORTE = 'PASS',
  CARNETEXT = 'CEXTRAJ',
  OTROS = 'OTROS',
}

export enum EstacionTipoEnum {
  MOZO = 1,
  CAJA = 2
}

export enum CanalVentaEnum {
  VENTA_NORMAL = 1,
  ESPACIO = 2,
  PARA_LLEVAR = 3,
  DELIVERY = 4,
  ENTRADAS = 5,
  OTROS = 6,
}

export enum NivelUsuarioEnum {
  Administrador = 1,
  Cajero = 2,
  Mozo = 3
}