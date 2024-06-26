export class Turno {
    public IdTurno: number;
    public NroTurno: number;
    public IdCaja: string;
    public FechaTrabajo: string;
    public FechaInicio: string;
    public Estado: number;
    public TipoCambio: number;
    public TipoCambioVenta: number;
    public UsuReg: number;
    public TurnoRestaurante: number;

    constructor (IdCaja: string,
         FechaTrabajo: string,
         FechaInicio: string,
         Estado: number,
         TipoCambio: number,
         TipoCambioVenta: number,
         UsuReg: number,
         TurnoRestaurante: number){

            this.IdCaja=IdCaja;
            this.FechaTrabajo=FechaTrabajo;
            this.FechaInicio=FechaInicio;
            this.Estado=Estado;
            this.TipoCambio=TipoCambio;
            this.TipoCambioVenta=TipoCambioVenta;
            this.UsuReg=UsuReg;
            this.TurnoRestaurante=TurnoRestaurante;
         }
}
