import { Empleado } from "./empleado.models";
import { Nivel_Usuario } from "./nivel_usuario.models";
import { Turno } from "./turno.models";

export class Usuario {
  public IdUsuario: number;
  public NombreUsuario: string;
  public Email: string;
  public Activo: boolean;
  public IdNivel: number;
  public IdEmpleado: number;
  public Token: string;
  public TipoCompu: number;
  public NivelDescripcion: string;
  public NombreEmpleado: string;
  public EsUsuarioActual: boolean;
  public PuedeEditarEmpleado: boolean;
  public PuedeCambiarNivel: boolean;
  public PuedeDesactivar: boolean;
  public PuedeEliminar: boolean;
  /** Preferencia opcional; null significa usar la cultura del tenant. */
  public Cultura?: string | null;
}

/** DTO para PUT /api/Usuario/{id} — sin contraseña */
export interface UsuarioUpdateDto {
  Email: string;
  Activo: boolean;
  IdNivel: number;
  IdEmpleado: number;
}

