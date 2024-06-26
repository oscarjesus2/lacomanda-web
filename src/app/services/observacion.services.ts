import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { Observacion } from '../models/observacion.models';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ObservacionService {

    private basePath = environment.apiUrl + '/observacion';
    

    constructor(private http: HttpClient) { }

    getAllObservacion(): Observable<Observacion[]> {
        return this.http.get<Observacion[]>(this.basePath + '/listar');
    }

}