export interface CaracteristicaLicenciaTenant {
  Codigo: string;
  Nombre: string;
  Grupo: string;
  TipoValor: string;
  Habilitada: boolean;
  Limite?: number | null;
}

export interface LicenciaTenant {
  PlanCodigo: string;
  PlanNombre: string;
  Estado: string;
  ModuloElegido?: string | null;
  Caracteristicas: CaracteristicaLicenciaTenant[];
}

export interface CuotaComprobantesMensuales {
  Limite: number | null;
  Utilizados: number;
  Restantes: number | null;
  Agotada: boolean;
  PeriodoInicioUtc: string;
  PeriodoFinUtc: string;
}
