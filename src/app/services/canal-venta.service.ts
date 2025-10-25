
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CanalVenta } from '../models/canalventa.models';
import { ApiResponse } from '../interfaces/apirResponse.interface';

@Injectable({
  providedIn: 'root'
})
export class CanalVentaService {
    private basePath = environment.apiUrl + '/canalventa';

  constructor(private http: HttpClient) {}

  listarActivos(): Observable<CanalVenta[]> {
    return this.http.get<ApiResponse<CanalVenta[]>>(`${this.basePath}`)
      .pipe(map(r => (r.Data ?? []).filter(x => x.Activo)));
  }
}
