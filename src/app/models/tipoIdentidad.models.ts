export class TipoIdentidad {

   public IdTipoIdentidad: string;
   public Descripcion: string;
   public CodigoTributario?: string; 
    
   constructor(init?: Partial<TipoIdentidad>) {
      Object.assign(this, init);
  }
}