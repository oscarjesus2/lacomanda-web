export class Cargo {

   public IdCargo: string;
   public Descripcion: string;
   
   constructor(init?: Partial<Cargo>) {
      Object.assign(this, init);
  }
}