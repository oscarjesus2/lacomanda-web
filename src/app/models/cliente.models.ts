import { TipoIdentidad } from "./tipoIdentidad.models";

export class Cliente {
    public IdCliente: string;
    public RazonSocial: string;
    public Direccion: string;
    public NumeroIdentificacion: string;
    public Referencia: string;
    public Correo: string;
    public IdTipoIdentidad: string;
    public TipoIdentidad: TipoIdentidad;
    public Telefono: string;
    public DireccionDelivery: string;
    public ReferenciaDelivery: string;
    constructor(init?: Partial<Cliente>) {
        Object.assign(this, init);
    }
}
