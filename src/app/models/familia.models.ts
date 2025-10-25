export class Familia {

    public IdFamilia: number;
    public Descripcion: string;    

    constructor(init?: Partial<Familia>) {
        Object.assign(this, init);
    }
}
