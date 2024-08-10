import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { Cliente  } from '../models/cliente.models';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ClienteService {

    private basePath = environment.apiUrl + '/cliente/';

    constructor(private http: HttpClient) { }

    ServicioBuscarCliente(numeroRuc: string, idTipoEntidad: number): Observable<Cliente[]> {
        return this.http.get<[Cliente]>(this.basePath + 'servicio/' + numeroRuc + '/' + idTipoEntidad);
    }

}