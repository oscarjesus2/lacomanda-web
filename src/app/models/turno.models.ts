export class Turno {
    public IdTurno: number;
    public NroTurno: number;
    public IdCaja: string;
    public FechaTrabajo: Date;
    public FechaInicio: string;
    public Estado: number;
    public TipoCambio: number;
    public TipoCambioVenta: number;
    public UsuReg: number;
    public TurnoRestaurante: number;
    constructor(init?: Partial<Turno>) {
      Object.assign(this, init);
  }

}
