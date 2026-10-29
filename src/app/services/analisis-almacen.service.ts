import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import { environment } from 'src/environments/environment';

export type FilaAnalisisAlmacen = Record<string, string | number | null>;

@Injectable({ providedIn: 'root' })
export class AnalisisAlmacenService {
  constructor(private readonly http: HttpClient) {}

  consultar(
    ruta: string,
    desdeUtc?: string,
    hastaUtcExclusivo?: string,
  ): Observable<ApiResponse<FilaAnalisisAlmacen[]>> {
    let params = new HttpParams();
    if (desdeUtc && hastaUtcExclusivo) {
      params = params.set('DesdeUtc', desdeUtc)
        .set('HastaUtcExclusivo', hastaUtcExclusivo);
    }
    return this.http.get<ApiResponse<FilaAnalisisAlmacen[]>>(
      `${environment.apiUrl}/reportes-almacen/${ruta}`,
      { params },
    );
  }
}
