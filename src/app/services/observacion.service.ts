import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { Observacion } from '../models/observacion.models';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';

@Injectable({
    providedIn: 'root'
})
export class ObservacionService {

    private basePath = environment.apiUrl + '/observacion';
    

    constructor(private http: HttpClient) { }

    getAllObservacion(): Observable<ApiResponse<Observacion[]>> {
        return this.http.get<ApiResponse<Observacion[]>>(this.basePath + '/listar');
    }

}