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
