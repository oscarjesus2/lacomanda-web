import { Usuario } from "./usuario.models";

export class Session {
  public Token:        string;
  public RefreshToken: string;
  public User:         Usuario;
  public Ip:           string;
  public TenantID:     string;
  public nombresucursal: string;
  /** Cultura predeterminada configurada para el tenant. */
  public CulturaTenant: string;
  /** Cultura efectiva: preferencia del usuario o fallback del tenant. */
  public Cultura:       string;
  public boletaRapida:   boolean = false;

  constructor(
    token:         string,
    refreshToken:  string,
    user:          Usuario,
    ip:            string,
    tenantID:      string,
    nombresucursal: string,
    culturaTenant: string,
  ) {
    this.Token         = token;
    this.RefreshToken  = refreshToken;
    this.User          = user;
    this.Ip            = ip;
    this.TenantID      = tenantID;
    this.nombresucursal = nombresucursal;
    this.CulturaTenant  = culturaTenant;
    this.Cultura        = culturaTenant;
  }
}
