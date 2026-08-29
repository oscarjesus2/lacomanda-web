import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { map, Observable } from 'rxjs';
import { CajaDto  } from '../models/caja.models';
import { CanalVenta } from '../models/canalventa.models';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { CajaTipoDocumento } from '../models/caja-tipo-documento.model';

@Injectable({
    providedIn: 'root'
})
export class CajaService {

    private basePath = environment.apiUrl + '/caja';

    constructor(private http: HttpClient) { }

    getAllCaja(incluyeGeneral: boolean): Observable<ApiResponse<CajaDto[]>> {
        return this.http.get<ApiResponse<CajaDto[]>>(`${this.basePath}?incluyeGeneral=${incluyeGeneral}`);
    }
    
    getCaja(idCaja: number): Observable<ApiResponse<CajaDto>> {
        return this.http.get<ApiResponse<CajaDto>>(`${this.basePath}/${idCaja}`);
    }

    crear(m: CajaDto): Observable<ApiResponse<CajaDto>> {
        return this.http.post<ApiResponse<CajaDto>>(this.basePath, m);
    }
    actualizar(m: CajaDto): Observable<ApiResponse<CajaDto>> {
        return this.http.put<ApiResponse<CajaDto>>(`${this.basePath}/${m.IdCaja}`, m);
    }
    eliminar(id: number): Observable<ApiResponse<boolean>> {
        return this.http.delete<ApiResponse<boolean>>(`${this.basePath}/${id}`);
    }

    /** GET /api/Caja/{idCaja}/canales-venta — canales habilitados para una caja */
    getCanalesVentaByCaja(idCaja: number): Observable<CanalVenta[]> {
        return this.http.get<ApiResponse<CanalVenta[]>>(`${this.basePath}/${idCaja}/canales-venta`)
            .pipe(map(r => r.Data ?? []));
    }

    /** GET /api/Caja/{idCaja}/tipo-documento — tipos de documento configurados para una caja */
    getTipoDocumentoByCaja(idCaja: number): Observable<CajaTipoDocumento[]> {
        return this.http.get<ApiResponse<CajaTipoDocumento[]>>(`${this.basePath}/${idCaja}/tipo-documento`)
            .pipe(map(r => r.Data ?? []));
    }

}