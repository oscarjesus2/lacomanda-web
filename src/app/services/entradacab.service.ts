
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Empleado } from '../models/empleado.models';
import { DescuentoCodigo } from '../models/descuentocodigo.models';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { ImpresionDTO } from '../interfaces/impresionDTO.interface';
import { EntradaCab } from '../models/entradacab.models';

@Injectable({
  providedIn: 'root'
})
export class EntradaCabService {
    private basePath = environment.apiUrl + '/EntradaCab/';

  constructor(private http: HttpClient) {}

  GrabarEgresoTaxista(empleado: Empleado, entradaCab: EntradaCab, idVentaRef: number): Observable<ApiResponse<ImpresionDTO[]>>{
    const body = {
      Empleado: empleado,
      EntradaCab: entradaCab,
      IdVentaRef: idVentaRef
  };
    return this.http.post<ApiResponse<ImpresionDTO[]>>(this.basePath + 'GrabarEgresoTaxista', body);
}
}
