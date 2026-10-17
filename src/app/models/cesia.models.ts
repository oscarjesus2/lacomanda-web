import { ConsultaAlertasStockCesia } from './cesia-stock.models';

export interface MensajeCesia {
  rol: 'user' | 'assistant';
  texto: string;
  imagenUrl?: string;
  fuentes?: string[];
  recomiendaTicket?: boolean;
  stock?: {
    consulta: ConsultaAlertasStockCesia | null;
    error: boolean;
    expandido: boolean;
  };
}

export interface ConsultarCesiaRequest {
  Pregunta: string;
  RutaActual: string;
  ImagenDataUrl?: string;
  Historial: Array<{
    Rol: 'user' | 'assistant';
    Texto: string;
  }>;
}

export interface RespuestaCesia {
  Respuesta: string;
  Plan: string;
  RecomiendaTicket: boolean;
  Fuentes: string[];
  Sugerencias: string[];
}
