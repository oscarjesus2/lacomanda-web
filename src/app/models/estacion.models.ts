import { EstacionTipoEnum } from '../enums/enum';

export class Estacion {
  IdEstacion: number;
  Descripcion: string;
  IdentificadorUnico: string;
  IdCaja: number;
  Tipo: EstacionTipoEnum;
}

export interface EstacionDescargaStock {
  IdEstacion: number;
  IdAreaAlmacen: number;
  Area: string;
  IdSubAreaAlmacen: number;
  SubArea: string;
}
