export class SubFamilia {
    public IdFamilia: number;
    public IdSubFamilia: number;
    public Descripcion: string;    

          
    constructor(init?: Partial<SubFamilia>) {
        Object.assign(this, init);
    }
}