import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { LibroReclamacion } from '../models/libro-reclamaciones.models';

@Injectable({ providedIn: 'root' })
export class LibroReclamacionesService {
  private readonly url = `${environment.apiUrl}/libro-reclamaciones`;

  constructor(private readonly http: HttpClient) {}

  listar(codigo?: string): Observable<ApiResponse<LibroReclamacion[]>> {
    let params = new HttpParams();
    if (codigo?.trim()) params = params.set('codigo', codigo.trim());
    return this.http.get<ApiResponse<LibroReclamacion[]>>(this.url, { params });
  }
}
