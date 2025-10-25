import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { Familia } from '../models/familia.models';
import { SubFamilia } from '../models/subfamilia.models'
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';

@Injectable({
    providedIn: 'root'
})
export class FamiliaService {

    private basePathFamilia = environment.apiUrl + '/familia';
    private basePathSubFamilia = environment.apiUrl + '/subfamilia';


    constructor(private http: HttpClient) { }

    getFamilias(): Observable<ApiResponse<Familia[]>> {
        return this.http.get<ApiResponse<Familia[]>>(this.basePathFamilia);
    }

    getSubFamilias(): Observable<ApiResponse<SubFamilia[]>> {
        return this.http.get<ApiResponse<SubFamilia[]>>(this.basePathSubFamilia);
    }

    createSubFamilia(SubFamilia: SubFamilia): Observable<ApiResponse<SubFamilia>> {
        return this.http.post<ApiResponse<SubFamilia>>(this.basePathSubFamilia, SubFamilia);
    }

    updateSubFamilia(SubFamilia: SubFamilia): Observable<ApiResponse<SubFamilia>> {
        // asumo que SubFamilia.IdSubFamilia viene seteado:
        return this.http.put<ApiResponse<SubFamilia>>(`${this.basePathSubFamilia}/${SubFamilia.IdSubFamilia}`, SubFamilia);
    }

    deleteSubFamilia(id: number): Observable<ApiResponse<boolean>> {
        return this.http.delete<ApiResponse<boolean>>(`${this.basePathSubFamilia}/${id}`);
    }

    createFamilia(Familia: Familia): Observable<ApiResponse<Familia>> {
        return this.http.post<ApiResponse<Familia>>(this.basePathFamilia, Familia);
    }

    updateFamilia(Familia: Familia): Observable<ApiResponse<Familia>> {
        // asumo que Familia.IdFamilia viene seteado:
        return this.http.put<ApiResponse<Familia>>(`${this.basePathFamilia}/${Familia.IdFamilia}`, Familia);
    }

    deleteFamilia(id: number): Observable<ApiResponse<boolean>> {
        return this.http.delete<ApiResponse<boolean>>(`${this.basePathFamilia}/${id}`);
    }
}
