export class Color {

   public IdColor: number;
   public Descripcion: string;
   public  Rgb1: number; // 0..255
   public Rgb2: number; // 0..255
   public Rgb3: number; // 0..255
   
   constructor(init?: Partial<Color>) {
      Object.assign(this, init);
  }
}