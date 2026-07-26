import { Empleado } from "./empleado.models";
import { Nivel_Usuario } from "./nivel_usuario.models";
import { Turno } from "./turno.models";

export class Usuario {
  public IdUsuario: number;
  public NombreUsuario: string;
  public Email: string;
  public Activo: boolean;
  public Contrasenia: string;   // solo para creación
  public IdNivel: number;
  public IdEmpleado: number;
  public Token: string;
  public TipoCompu: number;
  public NivelDescripcion: string;
  public NombreEmpleado: string;
  /** Preferencia opcional; null significa usar la cultura del tenant. */
  public Cultura?: string | null;
}

/** DTO para PUT /api/Usuario/{id} — sin contraseña */
export interface UsuarioUpdateDto {
  NombreUsuario: string;
  Email: string;
  Activo: boolean;
  IdNivel: number;
  IdEmpleado: number;
}

/** DTO para PUT /api/Usuario/{id}/cambiar-password */
export interface CambiarPasswordDto {
  PasswordActual: string;
  PasswordNueva: string;
  PasswordConfirmar: string;
}

