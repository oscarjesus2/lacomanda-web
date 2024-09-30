import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { Mesas } from '../models/mesas.models';
import { environment } from 'src/environments/environment';  // Importa el entorno correspondiente
import { ApiResponse } from '../interfaces/ApiResponse.interface';
import { PedidoMesaDTO } from '../interfaces/pedidomesaDTO.interface';

@Injectable({
    providedIn: 'root'
})
export class MesasService {

    private basePathMesas = environment.apiUrl + '/mesa';
 
    constructor(private http: HttpClient) { }

    getAllMesas(): Observable<Mesas[]> {
        return this.http.get<Mesas[]>(this.basePathMesas + '/listar');
    }

    getMesa(idMesa: string): Observable<Mesas> {
        return this.http.get<Mesas>(this.basePathMesas + '/' + idMesa);
    }

    ImprimirPrecuenta(idMesa: string): Observable<any[]> {
        return this.http.get<any[]>('/api/pedido/imprimirprecuenta/' + idMesa);
    }
}