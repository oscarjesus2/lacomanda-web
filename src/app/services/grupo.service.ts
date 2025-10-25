
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { Grupo } from '../models/grupo.models';

@Injectable({
  providedIn: 'root'
})
export class GrupoService {
    private basePath = environment.apiUrl + '/grupo';

  constructor(private http: HttpClient) {}

  getGrupos(tipoGrupo: 'I' | 'P' | 'A'): Observable<ApiResponse<Grupo[]>> {
    const params = new HttpParams().set('tipoGrupo', tipoGrupo);
    return this.http.get<ApiResponse<Grupo[]>>(this.basePath, { params });
  }

   create(Grupo: Grupo): Observable<ApiResponse<Grupo>> {
        return this.http.post<ApiResponse<Grupo>>(this.basePath, Grupo);
    }

    update(Grupo: Grupo): Observable<ApiResponse<Grupo>> {
        return this.http.put<ApiResponse<Grupo>>(`${this.basePath}/${Grupo.IdGrupo}`, Grupo);
    }

    eliminar(id: number): Observable<ApiResponse<boolean>> {
        return this.http.delete<ApiResponse<boolean>>(`${this.basePath}/${id}`);
    }
}
