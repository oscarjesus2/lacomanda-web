import { Empleado } from "./empleado.models";
import { Nivel_Usuario } from "./nivel_usuario.models";
import { Turno } from "./turno.models";

export class Usuario {    
  public IdUsuario: number;
  public Username: string;
  public Activo: boolean;
  public Password: string;
  public ClaveE: string;
  public IdNivel: string;
  public IdEmpleado: string;
  public Token:string;
  public TipoCompu: number;
  public Empleado: Empleado;
  public Nivel_Usuario: Nivel_Usuario;
}

