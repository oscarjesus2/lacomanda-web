export class SubFamilia {
    public IdFamilia: string;
    public IdSubFamilia: string;
    public Descripcion: string;    

    constructor(IdSubFamilia: string, Descripcion: string, IdFamilia: string) {
        this.IdSubFamilia = IdSubFamilia;
        this.Descripcion = Descripcion;       
        this.IdFamilia= IdFamilia; 
    }
}
