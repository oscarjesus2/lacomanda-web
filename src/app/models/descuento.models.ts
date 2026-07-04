export class Descuento {
  public IdDescuento: number;
  public Descripcion: string;
  public Porcentaje: number;
  public TipoDescuento: number;
  public Activo: boolean;

  constructor(init?: Partial<Descuento>) {
    Object.assign(this, init);
  }
}

export interface DescuentoCreateDto {
  Descripcion: string;
  Porcentaje: number;
  TipoDescuento: number;
  Activo: boolean;
}