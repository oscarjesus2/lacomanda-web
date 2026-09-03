
export class ProductSave {

    public IdProducto: string;
    public NombreCompleto: string;
    public Precio: number;
    public Usuario: number;
    public Activo: number;

    constructor(IdProducto: string, NombreCompleto: string, Precio: number, Usuario: number, Activo: number) {
        this.IdProducto = IdProducto;
        this.NombreCompleto = NombreCompleto;
        this.Precio = Precio;
        this.Usuario = Usuario;
        this.Activo = Activo;
    }
}

