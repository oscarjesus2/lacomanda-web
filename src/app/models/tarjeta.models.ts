export class Tarjeta {

   public IdTarjeta: number;
   public Descripcion: string;
   public IdSocioNegocio?: number | null;
   public Orden?: number | null;

   constructor(init?: Partial<Tarjeta>) {
      Object.assign(this, init);
  }
}

/** Datos que acepta el alta y la edición de una tarjeta. */
export interface TarjetaGuardar {
  Descripcion: string;
  IdSocioNegocio: number | null;
  Orden: number | null;
}
