export class TipoIdentidad {

   public IdTipoIdentidad: string;
   public Descripcion: string;
   public Abreviatura?: string;
   public CodigoTributario?: string;
   public RequiereParaFactura?: boolean;
   public RegexValidacion?: string;
   public Mascara?: string;
   public Activo?: boolean;

   constructor(init?: Partial<TipoIdentidad>) {
      Object.assign(this, init);
  }
}
