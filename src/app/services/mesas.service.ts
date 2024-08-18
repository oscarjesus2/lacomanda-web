import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { Mesas } from '../models/mesas.models';
import { environment } from 'src/environments/environment';  // Importa el entorno correspondiente

@Injectable({
    providedIn: 'root'
})
export class MesasService {

    private basePathMesas = environment.apiUrl + '/mesa';
    private basePathConsultarMesa = environment.apiUrl + '/pedido/listarpedido_x_mesa/';
  
    constructor(private http: HttpClient) { }

    getAllMesas(): Observable<Mesas[]> {
        return this.http.get<Mesas[]>(this.basePathMesas + '/listar');
    }

    findMesaById(idMesa: string): Observable<any[]> {
        return this.http.get<any[]>(this.basePathConsultarMesa + idMesa);
    }
    ImprimirPrecuenta(idMesa: string): Observable<any[]> {
        return this.http.get<any[]>('/api/pedido/imprimirprecuenta/' + idMesa);
    }
}