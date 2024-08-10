import { TipoDocCliente } from "./tipodoccliente.models";

export class Cliente {
    public IdCliente: string;
    public RazonSocial: string;
    public Direccion: string;
    public Ruc: string;
    public Referencia: string;
    public Correo: string;
    public TipoIdentidad: TipoDocCliente;
    public Estado: string;

    constructor(init?: Partial<Cliente>) {
        Object.assign(this, init);
    }
}
