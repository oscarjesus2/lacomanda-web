export class SocioNegocio {

   public IdSocioNegocio: number;
   public Descripcion: string;
   
   constructor(init?: Partial<SocioNegocio>) {
      Object.assign(this, init);
  }
}