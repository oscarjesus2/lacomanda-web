import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { map, Observable } from 'rxjs';
import { Caja  } from '../models/caja.models';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { CajaTipoDocumento } from '../models/caja-tipo-documento.model';

@Injectable({
    providedIn: 'root'
})
export class CajaService {

    private basePath = environment.apiUrl + '/caja';

    constructor(private http: HttpClient) { }

    getAllCaja(incluyeGeneral: boolean): Observable<ApiResponse<Caja[]>> {
        return this.http.get<ApiResponse<Caja[]>>(`${this.basePath}?incluyeGeneral=${incluyeGeneral}`);
    }
    
    getCaja(idCaja: number): Observable<ApiResponse<Caja>> {
        return this.http.get<ApiResponse<Caja>>(`${this.basePath}/${idCaja}`);
    }

    crear(m: Caja): Observable<ApiResponse<Caja>> {
        return this.http.post<ApiResponse<Caja>>(this.basePath, m);
    }
    actualizar(m: Caja): Observable<ApiResponse<Caja>> {
        return this.http.put<ApiResponse<Caja>>(`${this.basePath}/${m.IdCaja}`, m);
    }
    eliminar(id: number): Observable<ApiResponse<boolean>> {
        return this.http.delete<ApiResponse<boolean>>(`${this.basePath}/${id}`);
    }
}