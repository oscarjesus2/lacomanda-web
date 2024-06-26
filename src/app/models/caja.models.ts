import { Turno } from "./turno.models";

export class Caja {
    public IdCaja: string;
    public Descripcion: string;
    public Activo: number;
    public TurnoAbierto: Turno;
}
