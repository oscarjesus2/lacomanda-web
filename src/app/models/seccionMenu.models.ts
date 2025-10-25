export class SeccionMenu {

   public IdSeccionMenu: number;
   public Descripcion: string;
   
   constructor(init?: Partial<SeccionMenu>) {
      Object.assign(this, init);
  }
}