export interface SolicitudAccesoMesa {
  IdSesion: number;
  Token: string;
  CodigoVisual: string;
  Estado: string;
  Ambiente: string;
  Espacio: string;
  Numero: number;
  ExpiraUtc: Date;
}

export interface EstadoAccesoMesa {
  IdSesion: number;
  Estado: string;
  Ambiente: string;
  Espacio: string;
  Numero: number;
  CodigoVisual: string;
  ExpiraUtc: Date;
  PuedePedir: boolean;
  PuedePagarConTarjeta: boolean;
  IdPedido?: number;
  NroCuenta?: number;
}

export interface SolicitudMesaPendiente {
  IdSesion: number;
  IdEspacio: number;
  Ambiente: string;
  Espacio: string;
  Numero: number;
  CodigoVisual: string;
  FechaSolicitudUtc: Date;
  ExpiraUtc: Date;
}

export interface ConfirmarSolicitudMesa {
  IdCaja: number;
  IdTurno: number;
  NroPax: number;
  IdentificadorEstacion: string;
}

export interface CategoriaCartaMesaCliente {
  IdSubFamilia: number;
  Nombre: string;
  IdFamilia: number;
  Familia: string;
}

export interface OpcionMenuCartaMesaCliente {
  IdProducto: number;
  Nombre: string;
}

export interface SeccionMenuCartaMesaCliente {
  IdSeccionMenu: number;
  Descripcion: string;
  Cantidad: number;
  Opciones: OpcionMenuCartaMesaCliente[];
}

export interface ProductoCartaMesaCliente {
  IdProducto: number;
  Nombre: string;
  Descripcion: string;
  Precio: number;
  Moneda: string;
  Tipo: number;
  IdSubFamilia: number;
  Color: string;
  TieneImagen: boolean;
  CantidadComplementos: number;
  SeccionesMenu: SeccionMenuCartaMesaCliente[];
}

export interface CartaPublicaMesaCliente {
  Restaurante: string;
  Direccion: string;
  Ambiente: string;
  Espacio: string;
  Numero: number;
  AsistenteIaDisponible: boolean;
  Carta: CartaMesaCliente;
}

export interface MensajeAsistenteCartaMesaCliente {
  Rol: 'user' | 'assistant';
  Contenido: string;
}

export interface ConsultarAsistenteCartaMesaCliente {
  Pregunta: string;
  Historial: MensajeAsistenteCartaMesaCliente[];
}

export interface RespuestaAsistenteCartaMesaCliente {
  Respuesta: string;
  EsOrientacionGeneral: boolean;
  RecomiendaConsultarPersonal: boolean;
}

export interface ComplementoCartaMesaCliente {
  IdProducto: number;
  Nombre: string;
  Factor: number;
  Posicion: number;
}

export interface CartaMesaCliente {
  Moneda: string;
  Categorias: CategoriaCartaMesaCliente[];
  Productos: ProductoCartaMesaCliente[];
  Complementos: ComplementoCartaMesaCliente[];
}

export interface RegistrarPedidoMesaCliente {
  Items: ItemPedidoMesaCliente[];
}

export interface ItemPedidoMesaCliente {
  IdProducto: number;
  Cantidad: number;
  Observacion?: string;
  Complementos: Array<{ IdProducto: number; Cantidad: number }>;
  OpcionesMenu: Array<{
    IdSeccionMenu: number;
    IdProducto: number;
    Cantidad: number;
    Observacion?: string;
  }>;
}

export interface PedidoMesaClienteResultado {
  IdPedido: number;
  NroCuenta: number;
  Total: number;
}
