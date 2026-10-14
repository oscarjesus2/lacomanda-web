export interface BancoDestino {
  IdBanco: number;
  Descripcion: string;
  NumeroCuenta?: string | null;
  Cci?: string | null;
  Iban?: string | null;
  BicSwift?: string | null;
  IdMoneda: string;
  Activo: boolean;
}

export interface CrearBancoDestino {
  Descripcion: string;
  NumeroCuenta?: string | null;
  Cci?: string | null;
  Iban?: string | null;
  BicSwift?: string | null;
  IdMoneda: string;
}

export interface ActualizarBancoDestino extends CrearBancoDestino {
  Activo: boolean;
}
