import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { Espacios } from '../models/espacios.models';
import { environment } from 'src/environments/environment';  // Importa el entorno correspondiente
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { PedidoEspacioDTO } from '../interfaces/pedidoespacioDTO.interface';

@Injectable({
  providedIn: 'root'
})
export class EspaciosService {
  private basePathMesas = environment.apiUrl + '/espacio';

  constructor(private http: HttpClient) { }

  createEspacio(mesa: Espacios): Observable<ApiResponse<Espacios>> {
    return this.http.post<ApiResponse<Espacios>>(this.basePathMesas, mesa);
  }

  updateEspacio(mesa: Espacios): Observable<ApiResponse<Espacios>> {
    // asumo que mesa.IdMesa viene seteado:
    return this.http.put<ApiResponse<Espacios>>(`${this.basePathMesas}/${mesa.IdEspacio}`, mesa);
  } 

  deleteEspacio(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.basePathMesas}/${id}`);
  }

  GetAllEspaciosConPedidos(): Observable<ApiResponse<Espacios[]>> {
    return this.http.get<ApiResponse<Espacios[]>>(this.basePathMesas + '/listar');
  }

  GetAllEspacios(): Observable<ApiResponse<Espacios[]>> {
    return this.http.get<ApiResponse<Espacios[]>>(this.basePathMesas);
  }

  GetEspacio(idEspacio: number): Observable<Espacios> {
    return this.http.get<Espacios>(this.basePathMesas + '/' + idEspacio);
  }

  CambiarEspacio(idEspacioOrigen: number, idEspacioDestino: number): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.basePathMesas}/CambiarEspacio/${idEspacioOrigen}/${idEspacioDestino}`, {});
  }

  UnirEspacio(idEspacioOrigen: number, idEspacioDestino: number, idUsuario: number): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.basePathMesas}/UnirEspacio/${idEspacioOrigen}/${idEspacioDestino}`, {});
  }

  ImprimirPrecuenta(idEspacio: number): Observable<any[]> {
    return this.http.get<any[]>('/api/pedido/imprimirprecuenta/' + idEspacio);
  }
}