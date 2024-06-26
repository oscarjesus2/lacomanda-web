export class Cliente {

    public RazonSocial: string;
    public NroDocumento: string;
    public Direccion: string;

    constructor(RazonSocial: string, NroDocumento: string, Direccion: string) {
        this.RazonSocial = RazonSocial;
        this.NroDocumento = NroDocumento;
        this.Direccion = Direccion;
    }
}
