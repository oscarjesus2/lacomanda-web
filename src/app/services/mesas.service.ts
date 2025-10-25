import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { Mesas } from '../models/mesas.models';
import { environment } from 'src/environments/environment';  // Importa el entorno correspondiente
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { PedidoMesaDTO } from '../interfaces/pedidomesaDTO.interface';

@Injectable({
  providedIn: 'root'
})
export class MesasService {
  private basePathMesas = environment.apiUrl + '/mesa';

  constructor(private http: HttpClient) { }


  createMesa(mesa: Mesas): Observable<ApiResponse<Mesas>> {
    return this.http.post<ApiResponse<Mesas>>(this.basePathMesas, mesa);
  }

  updateMesa(mesa: Mesas): Observable<ApiResponse<Mesas>> {
    // asumo que mesa.IdMesa viene seteado:
    return this.http.put<ApiResponse<Mesas>>(`${this.basePathMesas}/${mesa.IdMesa}`, mesa);
  } 

  deleteMesa(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.basePathMesas}/${id}`);
  }

  GetAllMesasConPedidos(): Observable<ApiResponse<Mesas[]>> {
    return this.http.get<ApiResponse<Mesas[]>>(this.basePathMesas + '/listar');
  }

  GetAllMesas(): Observable<ApiResponse<Mesas[]>> {
    return this.http.get<ApiResponse<Mesas[]>>(this.basePathMesas);
  }

  GetMesa(idMesa: number): Observable<Mesas> {
    return this.http.get<Mesas>(this.basePathMesas + '/' + idMesa);
  }

  CambiarMesa(idMesaOrigen: number, idMesaDestino: number): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.basePathMesas}/CambiarMesa/${idMesaOrigen}/${idMesaDestino}`, {});
  }

  UnirMesa(idMesaOrigen: number, idMesaDestino: number, idUsuario: number): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.basePathMesas}/UnirMesa/${idMesaOrigen}/${idMesaDestino}/${idUsuario}`, {});
  }

  ImprimirPrecuenta(idMesa: number): Observable<any[]> {
    return this.http.get<any[]>('/api/pedido/imprimirprecuenta/' + idMesa);
  }
}