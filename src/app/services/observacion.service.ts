import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { map, Observable } from 'rxjs';
import { Observacion } from '../models/observacion.models';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';

@Injectable({
    providedIn: 'root'
})
export class ObservacionService {

    private basePath = environment.apiUrl + '/observacion';
    

    constructor(private http: HttpClient) { }

    getAllObservacion(): Observable<ApiResponse<Observacion[]>> {
        return this.http.get<ApiResponse<Observacion[]>>(this.basePath);
    }

    listarPorTipo(tipo: number): Observable<Observacion[]> {
        return this.http.get<ApiResponse<Observacion[]>>(`${this.basePath}/tipo/${tipo}`)
        .pipe(map(r => r.Data ?? []));
    }

    crear(m: Observacion): Observable<ApiResponse<Observacion>> {
        return this.http.post<ApiResponse<Observacion>>(this.basePath, m);
    }

    actualizar(m: Observacion): Observable<ApiResponse<Observacion>> {
        return this.http.put<ApiResponse<Observacion>>(`${this.basePath}/${m.IdObservacion}`, m);
    }

    eliminar(id: number): Observable<ApiResponse<boolean>> {
        return this.http.delete<ApiResponse<boolean>>(`${this.basePath}/${id}`);
    }
}