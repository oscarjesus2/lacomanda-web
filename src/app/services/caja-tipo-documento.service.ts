import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { CajaTipoDocumento } from '../models/caja-tipo-documento.model';

@Injectable({ providedIn: 'root' })
export class CajaTipoDocumentoService {
  private basePath = environment.apiUrl + '/cajatipodocumento';
  constructor(private http: HttpClient) {}

    GetTiposDocumentos(idCaja: number): Observable<CajaTipoDocumento[]> {
        return this.http.get<ApiResponse<CajaTipoDocumento[]>>(`${this.basePath}/${idCaja}/documentos`)
        .pipe(map(r => r.Data ?? []));
    }
    upsertDocs(idCaja: number, docs: CajaTipoDocumento[]): Observable<boolean> {
        return this.http.put<ApiResponse<boolean>>(`${this.basePath}/${idCaja}/documentos`, docs)
        .pipe(map(r => !!r.Success));
    }
}