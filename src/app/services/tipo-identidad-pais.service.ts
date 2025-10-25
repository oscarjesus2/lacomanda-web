import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';

export interface TipoIdentidadPaisVM {
  IdTipoIdentidad: string;
  PaisISO2: string;
  Activo: boolean;
  RegexValidacion?: string;
  Mascara?: string;
  RequiereParaFactura: boolean;
  CodigoTributario?: string;
  Descripcion: string; 
}

@Injectable({ providedIn: 'root' })
export class TipoIdentidadPaisService {
  private base = environment.apiUrl + '/tipoidentidadpais';

  constructor(private http: HttpClient) {}

  // Devuelve los tipos soportados para el país
  byPais(paisISO2: string): Observable<TipoIdentidadPaisVM[]> {
    return this.http.get<ApiResponse<TipoIdentidadPaisVM[]>>(`${this.base}/pais/${paisISO2}`)
      .pipe(map(r => r.Data));
  }
}
