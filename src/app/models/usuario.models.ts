import { Empleado } from "./empleado.models";
import { Nivel_Usuario } from "./nivel_usuario.models";
import { Turno } from "./turno.models";

export class Usuario {
  public IdUsuario: number;
  public NombreUsuario: string;
  public Email: string;
  public Activo: boolean;
  public Contraseña: string;
  public IdNivel: number;
  public IdEmpleado: number;
  public Token:string;
  public TipoCompu: number;
  public NivelDescripcion: string;
  public NombreEmpleado: string;
}

