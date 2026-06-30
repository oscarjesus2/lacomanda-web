import { EstacionTipoEnum } from '../enums/enum';

export class Estacion {
  IdEstacion: number;
  Descripcion: string;
  IdentificadorUnico: string;
  IdCaja: number;
  Tipo: EstacionTipoEnum;
}
