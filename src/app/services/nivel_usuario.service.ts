import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { Nivel_Usuario } from '../models/nivel_usuario.models';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';

@Injectable({
    providedIn: 'root'
})
export class Nivel_UsuarioService {

    private basePath = environment.apiUrl + '/Nivel_Usuario';
    

    constructor(private http: HttpClient) { }

    getAllNivel_Usuario(): Observable<ApiResponse<Nivel_Usuario[]>> {
        return this.http.get<ApiResponse<Nivel_Usuario[]>>(this.basePath + '/listar');
    }

}