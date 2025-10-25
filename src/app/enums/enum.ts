export enum EnumTipoDocumento {
    BoletaVenta = 2,
    FacturaVenta = 1,
    Express = 8,
    NotaCreditoVenta = 9, 
    BoletaVentaManual = 7,
    FacturaVentaManual = 6
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

  export enum CanalVentaEnum
   {
       VENTA_NORMAL = 1,
       MESA = 2,
       PARA_LLEVAR = 3,
       DELIVERY = 4,
       ENTRADAS = 5,
       OTROS = 6,
   }

     export enum NivelUsuarioEnum
  {
      Administrador = 1,
      Cajero = 2,
      Mozo = 3
  }