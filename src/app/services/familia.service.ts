import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { Familia } from '../models/familia.models';
import { SubFamilia } from '../models/subfamilia.models'
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class FamiliaService {

    private basePathFamiliaListar = environment.apiUrl + '/familia/listar';    
    private basePathSubFamiliaListar = environment.apiUrl +  '/subfamilia/listar/';    


    constructor(private http: HttpClient) { }

    getFamilia(): Observable<Familia[]> {
        return this.http.get<Familia[]>(this.basePathFamiliaListar);
    }

    getSubFamilia(): Observable<SubFamilia[]>{
        return this.http.get<SubFamilia[]>(this.basePathSubFamiliaListar);
    }

}
