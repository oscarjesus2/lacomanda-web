import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { Ambiente } from '../models/ambiente.models';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';

@Injectable({
    providedIn: 'root'
})
export class AmbienteService {

    private basePath = environment.apiUrl + '/ambiente';

    constructor(private http: HttpClient) { }

    getAllAmbiente(): Observable<ApiResponse<Ambiente[]>> {
        return this.http.get<ApiResponse<Ambiente[]>>(this.basePath + '/listar');
    }

    getAmbiente(id: string): Observable<ApiResponse<Ambiente>> {
        return this.http.get<ApiResponse<Ambiente>>(`${this.basePath}/${id}`);
    }

    createAmbiente(a: Ambiente): Observable<ApiResponse<Ambiente>> {
        return this.http.post<ApiResponse<Ambiente>>(this.basePath, a);
    }

    updateAmbiente(a: Ambiente): Observable<ApiResponse<Ambiente>> {
        return this.http.put<ApiResponse<Ambiente>>(`${this.basePath}/${a.IdAmbiente}`, a);
    }

    deleteAmbiente(id: string): Observable<ApiResponse<boolean>> {
        return this.http.delete<ApiResponse<boolean>>(`${this.basePath}/${id}`);
    }
}