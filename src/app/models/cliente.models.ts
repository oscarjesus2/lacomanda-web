import { TipoIdentidad } from "./tipoIdentidad.models";

export class Cliente {
    public IdCliente: string;
    public RazonSocial: string;
    public Direccion: string;
    public NumeroIdentificacion: string;
    public Referencia: string;
    public Email: string;
    public IdTipoIdentidad: string;
    public TipoIdentidad: TipoIdentidad;
    public Telefono: string;
    public DireccionDelivery: string;
    public ReferenciaDelivery: string;
    public ItemDelivery: number;
    public AnexoDelivery: string;
    public CorreoDelivery: string;
    public PrecioDelivery: number;
    constructor(init?: Partial<Cliente>) {
        Object.assign(this, init);
    }
}
