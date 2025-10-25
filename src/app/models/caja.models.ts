import { Turno } from "./turno.models";

export class Caja {
    public IdCaja: number;
    public TurnoAbierto: Turno;
    public Descripcion: string;
    public Activo: boolean;
    public NroPedido: number; 
    public CajaPorDefecto: boolean;
    public UsuRegistro: number;
    public FecRegistro: string;
    public UsuModi?: number;
    public FecModi?: string;
    public IdCanalVentaDefecto: number;
    public EmitePrecuenta: boolean;
    public EmiteComanda: boolean;
    public EmiteDescuento: boolean;
    public PermiteDividirPedido: boolean;
    public PermiteCierreParcial: boolean;
    public EnvioElectronicoOnline: boolean;
    public PrecuentaLlevarDeliveryAutomatica: boolean;
  }

