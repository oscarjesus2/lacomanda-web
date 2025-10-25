export class Grupo {

   public IdGrupo: number;
   public Descripcion: string;
   public Activo: boolean;
   
   constructor(init?: Partial<Grupo>) {
      Object.assign(this, init);
  }
}