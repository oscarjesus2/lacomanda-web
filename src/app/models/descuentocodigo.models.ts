export class DescuentoCodigo {

   public Correlativo: number;
   public IdDescuento: string;
   public CodigoPromocional: string;
   public Activo: boolean;
   public IdPedido: number;
   public IdVenta: number;
   public UsuReg: number;
   public VinoConTaxista: boolean;
  
   constructor(init?: Partial<DescuentoCodigo>) {
      Object.assign(this, init);
  }
}

 