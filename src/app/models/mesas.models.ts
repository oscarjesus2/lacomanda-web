export class Mesas {

    public Activo: boolean;
    public Descripcion: string;
    public DescripcionPC: any;
    public Divide: number;
    public IdAmbiente: string;
    public IdCompu: number;
    public IdMesa: string;
    public IdTaxista: string;
    public Mesa: any;
    public NroPersonas: number;
    public Numero: number;
    public Ocupado: number;
    public Posicion: number;
    public Utilizado: number;
    public Visible: boolean;
    public Total: number;
    public NombreEmpleado:string;

        
    constructor(init?: Partial<Mesas>) {
        Object.assign(this, init);
    }
}
