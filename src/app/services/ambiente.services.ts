import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { Ambiente } from '../models/ambiente.models';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AmbienteService {

    private basePath = environment.apiUrl + '/ambiente/listar';

    constructor(private http: HttpClient) { }

    getAllAmbiente(): Observable<Ambiente[]> {
        return this.http.get<Ambiente[]>(this.basePath);
    }


}