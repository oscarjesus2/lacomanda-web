import { Turno } from "./turno.models";
import { Usuario } from "./user.models";

export class Session {

    public Token: string;
    public User: Usuario;
    public Ip: string;
    public TenantID: string;
    public nombresucursal: string;
    public boletaRapida: boolean = false;
    constructor(token: string, user: Usuario, Ip: string, tenantID: string, nombresucursal :string ) {
        this.Token = token;
        this.User = user;
        this.Ip=Ip;
        this.TenantID=tenantID;
        this.nombresucursal=nombresucursal;
    }
}