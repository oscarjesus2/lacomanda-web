import { Turno } from "./turno.models";
import { User } from "./user.models";

export class Session {

    public token: string;
    public user: User;
    public Ip: string;
    public sucursal: string;
    public nombresucursal: string;
    constructor(token: string, user: User, Ip: string, sucursal: string, nombresucursal :string ) {
        this.token = token;
        this.user = user;
        this.Ip=Ip;
        this.sucursal=sucursal;
        this.nombresucursal=nombresucursal;
    }
}