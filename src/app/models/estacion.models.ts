import { EstacionTipoEnum } from '../enums/enum';

export class Estacion {
  IdEstacion: number;
  Descripcion: string;
  HostName: string;
  IdCaja: number;
  Tipo: EstacionTipoEnum;
}
