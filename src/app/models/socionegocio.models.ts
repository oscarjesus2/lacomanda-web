export class SocioNegocio {

   public IdSocioNegocio: number;
   public Descripcion: string;
   public PorcentajeComision: number;
   public Activo: boolean;
   public PreciosProductos: ProductoPrecioSocioNegocio[];
   
   constructor(init?: Partial<SocioNegocio>) {
      Object.assign(this, init);
      this.PreciosProductos = this.PreciosProductos ?? [];
  }
}

export interface ProductoPrecioSocioNegocio {
  IdProducto: number;
  Precio: number;
}

export interface SocioNegocioSave {
  Descripcion: string;
  PorcentajeComision: number;
  Activo: boolean;
  PreciosProductos: ProductoPrecioSocioNegocio[];
}
