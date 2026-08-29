export class Espacios {

    public Activo: boolean;
    public Descripcion: string;
    public DescripcionPC: any;
    public Divide: number;
    public IdAmbiente: number;
    public IdEstacionEnUso: number;
    public IdEspacio: number;
    public IdTaxista: string;
    public Espacio: any;
    public NroPersonas: number;
    public Numero: number;
    public Ocupado: number;
    public Posicion: number;
    public Utilizado: number;
    public Visible: boolean;
    public Total: number;
    public NombreEmpleado:string;
    public Color: string;

        
    constructor(init?: Partial<Espacios>) {
        Object.assign(this, init);
    }
}
