export class Turno {
    public IdTurno: number;
    public NroTurno: number;
    public IdCaja: number;
    public FechaTrabajo: Date;
    public FechaInicio: string;
    public Estado: number;
    public TipoCambio: number;
    public TipoCambioVenta: number;
    public UsuReg: number;
    constructor(init?: Partial<Turno>) {
      Object.assign(this, init);
  }

}


export class AbrirTurno {
    public IdCaja: number;
    public FechaTrabajo: string;
    public TipoCambioVenta: number;
    public UsuReg: number;
    constructor(init?: Partial<Turno>) {
      Object.assign(this, init);
  }
}
