
export class ProductSave {

    public IdProducto: string;
    public Descripcion: string;
    public Precio: number;
    public Usuario: number;
    public Activo: number;

    constructor(IdProducto: string, Descripcion: string, Precio: number, Usuario: number, Activo: number) {
        this.IdProducto = IdProducto;
        this.Descripcion = Descripcion;
        this.Precio = Precio;
        this.Usuario = Usuario;
        this.Activo = Activo;
    }
}

