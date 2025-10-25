import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Configuracion } from '../models/configuracion.models';
import { ApiResponse } from '../interfaces/apirResponse.interface';

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private base = environment.apiUrl + '/config';

  constructor(private http: HttpClient) {}

  get(): Observable<Configuracion> {
    return this.http.get<ApiResponse<Configuracion>>(`${this.base}`)
      .pipe(map(r => r.Data));
  }

  save(model: Configuracion): Observable<Configuracion> {
    return this.http.put<ApiResponse<Configuracion>>(`${this.base}`, model)
      .pipe(map(r => r.Data));
  }
}
