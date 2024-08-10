export class TipoDocCliente {

   public IdTipoIdentidad: number;
   public Descripcion: string;
   public CodigoSunat?: string; 
    
   constructor(init?: Partial<TipoDocCliente>) {
      Object.assign(this, init);
  }
}