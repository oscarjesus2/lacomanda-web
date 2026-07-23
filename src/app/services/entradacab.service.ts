
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

  GrabarEgresoTaxista(empleado: Empleado, idVentaRef: number, total: number, idCaja: number): Observable<ApiResponse<ImpresionDTO[]>>{
    // El backend arma el Recibo Interno (RI) y su detalle; el front solo envía el taxista,
    // la venta a la que aplican los cupones, el monto de la comisión y la caja del turno.
    const body = {
      Empleado: empleado,
      IdVentaRef: idVentaRef,
      Total: total,
      IdCaja: idCaja
  };
    return this.http.post<ApiResponse<ImpresionDTO[]>>(this.basePath + 'GrabarEgresoTaxista', body);
}
}
