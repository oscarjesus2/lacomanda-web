import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { Caja  } from '../models/caja.models';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class CajaService {

    private basePath = environment.apiUrl + '/caja/';

    constructor(private http: HttpClient) { }

    getAllCaja(incluyeGeneral: number): Observable<Caja[]> {
        return this.http.get<[Caja]>(this.basePath + 'listar/' + incluyeGeneral);
    }

}