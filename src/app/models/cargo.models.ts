export class Cargo {

   public IdCargo: number;
   public Descripcion: string;
   
   constructor(init?: Partial<Cargo>) {
      Object.assign(this, init);
  }
}