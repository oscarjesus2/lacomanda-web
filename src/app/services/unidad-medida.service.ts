import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { UnidadMedida } from '../models/articulo.models';

@Injectable({ providedIn: 'root' })
export class UnidadMedidaService {
  private readonly basePath = `${environment.apiUrl}/unidades-medida`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<ApiResponse<UnidadMedida[]>> {
    return this.http.get<ApiResponse<UnidadMedida[]>>(this.basePath);
  }
}
