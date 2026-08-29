import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  CartaIaPrevisualizacion,
  ConfirmarImportacionCartaIa,
  ImportacionCartaIaResultado,
} from '../models/importacion-carta-ia.models';

@Injectable({ providedIn: 'root' })
export class ImportacionCartaIaService {
  private readonly basePath =
    `${environment.apiUrl}/productos/importacion-carta-ia`;

  constructor(private readonly http: HttpClient) {}

  previsualizar(imagenes: readonly File[]): Observable<ApiResponse<CartaIaPrevisualizacion>> {
    const form = new FormData();
    imagenes.forEach(imagen => form.append('Imagenes', imagen, imagen.name));
    return this.http.post<ApiResponse<CartaIaPrevisualizacion>>(
      `${this.basePath}/previsualizar`,
      form,
    );
  }

  confirmar(
    solicitud: ConfirmarImportacionCartaIa,
  ): Observable<ApiResponse<ImportacionCartaIaResultado>> {
    return this.http.post<ApiResponse<ImportacionCartaIaResultado>>(
      `${this.basePath}/confirmar`,
      solicitud,
    );
  }
}
