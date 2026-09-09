import { EstacionTipoEnum } from '../enums/enum';
import { DispositivoTipoEnum } from './device.models';

export class Estacion {
  IdEstacion: number;
  Descripcion: string;
  IdentificadorUnico: string;
  TipoDispositivo: DispositivoTipoEnum;
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
